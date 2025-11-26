from fastapi import APIRouter, Depends, HTTPException, Response, Request, BackgroundTasks, status
from sqlmodel import Session, select
from app.security import hash_password, verify_password
from app.db import get_session
from app.models import (
    User,
    UserCreate,
    UserRead,
    UserLogin,
    StudentProfile,
    EmailVerificationRequest,
    EmailResendRequest,
    PasswordChangeRequest,
    MessageResponse,
    EmailVerification,
)
from app.validators import validate_username, validate_password, validate_email_domain
from datetime import datetime, timedelta, timezone
import jwt
import os
import secrets
import string
from dotenv import load_dotenv
import time
from typing import Any, Dict
from app.email_utils import send_verification_email

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "").strip()
ALGORITHM = os.getenv("JWT_ALGORITHM", "").strip()
if not SECRET_KEY or not ALGORITHM:
    # Fail fast so misconfiguration is caught early
    raise RuntimeError("JWT_SECRET or JWT_ALGORITHM missing in environment")

# Token expiration (minutes). Default 4h if not supplied.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "240"))
if ACCESS_TOKEN_EXPIRE_MINUTES < 5:
    print(f"[WARN] ACCESS_TOKEN_EXPIRE_MINUTES is very low: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")

# Basic brute force mitigation config (env-tunable)
MAX_FAILED_LOGIN_ATTEMPTS = int(os.getenv("MAX_FAILED_LOGIN_ATTEMPTS", "5"))
ACCOUNT_LOCK_MINUTES = int(os.getenv("ACCOUNT_LOCK_MINUTES", "15"))  # lock duration

# Cache decoded tokens to avoid re-decoding / verifying on every single request.
# NOTE: This introduces a trade-off: revocations (e.g., user deletion) propagate
# only after the cache TTL. Keep TTL modest.
TOKEN_CACHE_TTL_SECONDS = int(os.getenv("JWT_CACHE_TTL_SECONDS", "600"))  # default 10 minutes

# token -> {"user_id": int, "exp": int(epoch seconds), "cached_at": float, "user_obj": User | None}
_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}

# Email verification configuration
# Length of numeric verification code and expiration time (in minutes)
VERIFICATION_CODE_LENGTH = int(os.getenv("VERIFICATION_CODE_LENGTH", "6"))
EMAIL_CODE_EXPIRATION_MINUTES = int(os.getenv("EMAIL_CODE_EXPIRATION_MINUTES", "15"))


def create_access_token(*, data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def generate_verification_code(length: int = VERIFICATION_CODE_LENGTH) -> str:
    alphabet = string.digits
    return "".join(secrets.choice(alphabet) for _ in range(length))


def ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def set_auth_cookie(response: Response, token: str) -> None:
    # In production you should set secure=True (HTTPS) and possibly SameSite=Strict depending on CSRF strategy.
    secure_flag = os.getenv("COOKIE_SECURE", "false").lower() == "true"
    same_site = os.getenv("COOKIE_SAMESITE", "lax").lower()
    if same_site not in {"lax", "strict", "none"}:
        same_site = "lax"
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        samesite=same_site,
        secure=secure_flag,
        path="/",
    )


def delete_auth_cookie(response: Response) -> None:
    response.delete_cookie(key="access_token", path="/")


def get_user_from_token(request: Request, session: Session) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    now = time.time()
    cache_entry = _TOKEN_CACHE.get(token)

    # Fast path: use cached decoded token info (primitive values only)
    if cache_entry and (now - cache_entry["cached_at"]) < TOKEN_CACHE_TTL_SECONDS:
        # Check expiration without re-decoding
        if now >= cache_entry["exp"]:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="Token expired")
        # Always load fresh ORM object from the provided session to avoid DetachedInstanceError
        user_id = cache_entry.get("user_id")
        if user_id is None:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="Invalid token cache entry")
        user_obj = session.exec(select(User).where(User.id == int(user_id))).first()
        if not user_obj:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="User not found")
        return user_obj

    # Slow path: decode JWT anew
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        exp = payload.get("exp")
        if user_id is None or exp is None:
            raise HTTPException(status_code=401, detail="Invalid token payload")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = session.exec(select(User).where(User.id == int(user_id))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Store / refresh cache with primitive values only (do not store ORM instances)
    _TOKEN_CACHE[token] = {
        "user_id": int(user_id),
        "exp": int(exp),
        "cached_at": now,
    }
    return user

router = APIRouter()

@router.post("/register", response_model=UserRead)
def register_user(
    user_in: UserCreate,
    response: Response,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
):
    email = (user_in.email or "").strip().lower()
    name = (user_in.name or "").strip()
    password = user_in.password or ""

    if not email or not name or not password:
        raise HTTPException(status_code=400, detail="Email, name and password are required")

    existing = session.exec(select(User).where(User.email == email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        validate_email_domain(email)
        validate_password(password)
        validate_username(name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = User(email=email, name=name, hashed_password=hash_password(password))
    session.add(user)
    try:
        session.commit()
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail="Failed to create user") from e
    session.refresh(user)

    university = None
    domain_part = email.split('@', 1)[1] if '@' in email else ''
    if domain_part:
        fragments = domain_part.split('.')
        if len(fragments) >= 2:
            university = '.'.join(fragments[-2:])

    try:
        profile = StudentProfile(user_id=user.id, university=university, username=name)
        session.add(profile)
        session.commit()
    except Exception:
        session.rollback()  # Non-fatal; continue without profile

    # Create initial email verification entry & send code if user not verified yet
    if not user.is_verified:
        verification_code = generate_verification_code()
        verification_hash = hash_password(verification_code)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=EMAIL_CODE_EXPIRATION_MINUTES)

        verification = EmailVerification(
            user_id=user.id,
            code_hash=verification_hash,
            expires_at=expires_at,
        )
        try:
            session.add(verification)
            session.commit()
        except Exception:
            session.rollback()  # Non-fatal; proceed without email but user remains unverified
        else:
            background_tasks.add_task(send_verification_email, user.email, verification_code, user.name)

    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)
    return user

@router.post("/login", response_model=UserRead)
def login_user(login_data: UserLogin, response: Response, session: Session = Depends(get_session)):
    email = (login_data.email or "").strip().lower()
    user = session.exec(select(User).where(User.email == email)).first()
    # Uniform error to avoid user enumeration
    invalid_error = HTTPException(status_code=401, detail="Invalid email or password")
    now = datetime.now(timezone.utc)

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)
    return user


@router.post("/verify-email", response_model=UserRead)
def verify_email(
    payload: EmailVerificationRequest,
    response: Response,
    session: Session = Depends(get_session),
) -> UserRead:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    verification = session.exec(
        select(EmailVerification).where(EmailVerification.user_id == user.id)
    ).first()

    if not verification:
        raise HTTPException(status_code=400, detail="No verification code found")

    if ensure_aware(verification.expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Verification code expired")

    if not verify_password(payload.code, verification.code_hash):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user.is_verified = True

    session.add(user)
    session.delete(verification)
    session.commit()
    session.refresh(user)

    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)

    return user


@router.post("/resend-verification", response_model=MessageResponse)
def resend_verification(
    payload: EmailResendRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> MessageResponse:
    user = session.exec(select(User).where(User.email == payload.email)).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email already verified")

    verification_code = generate_verification_code()
    verification_hash = hash_password(verification_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=EMAIL_CODE_EXPIRATION_MINUTES)

    verification = session.exec(
        select(EmailVerification).where(EmailVerification.user_id == user.id)
    ).first()

    if verification:
        verification.code_hash = verification_hash
        verification.expires_at = expires_at
        verification.created_at = datetime.now(timezone.utc)
    else:
        verification = EmailVerification(
            user_id=user.id,
            code_hash=verification_hash,
            expires_at=expires_at,
        )
        session.add(verification)

    session.commit()
    session.refresh(user)

    background_tasks.add_task(send_verification_email, user.email, verification_code, user.name)

    return MessageResponse(message="Verification code resent")


@router.post("/change-password", response_model=MessageResponse)
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    session: Session = Depends(get_session),
) -> MessageResponse:
    user = get_user_from_token(request, session)
    
    if not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    try:
        validate_password(payload.new_password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    
    user.hashed_password = hash_password(payload.new_password)
    session.add(user)
    session.commit()
    
    return MessageResponse(message="Password changed successfully")


@router.post("/logout")
def logout_user(response: Response):
    delete_auth_cookie(response)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserRead)
def get_current_user(request: Request, session: Session = Depends(get_session)):
    user = get_user_from_token(request, session)
    return user

@router.get("/me/stats")
def get_user_stats(request: Request, session: Session = Depends(get_session)):
    from app.models import Post, Comment
    user = get_user_from_token(request, session)
    
    post_count = session.exec(select(Post).where(Post.author_id == user.id)).all()
    comment_count = session.exec(select(Comment).where(Comment.user_id == user.id)).all()
    
    return {
        "posts": len(post_count),
        "comments": len(comment_count)
    }

@router.get("/", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
