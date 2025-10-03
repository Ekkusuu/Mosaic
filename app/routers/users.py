from fastapi import APIRouter, Depends, HTTPException, Response, Request, BackgroundTasks, status
from sqlmodel import Session, select
from app.security import hash_password, verify_password
from app.db import get_session
from app.models import User, UserCreate, UserRead, UserLogin, StudentProfile
from app.validators import validate_username, validate_password, validate_email_domain
from datetime import datetime, timedelta, timezone
import jwt
import os
import secrets
import string
from dotenv import load_dotenv
import time
from typing import Any, Dict

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "")
ALGORITHM = os.getenv("JWT_ALGORITHM", "")
# Token expiration (minutes). Default 4h if not supplied.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "240"))
if ACCESS_TOKEN_EXPIRE_MINUTES < 5:
    print(f"[WARN] ACCESS_TOKEN_EXPIRE_MINUTES is very low: {ACCESS_TOKEN_EXPIRE_MINUTES} minutes")

# Cache decoded tokens to avoid re-decoding / verifying on every single request.
# NOTE: This introduces a trade-off: revocations (e.g., user deletion) propagate
# only after the cache TTL. Keep TTL modest.
TOKEN_CACHE_TTL_SECONDS = int(os.getenv("JWT_CACHE_TTL_SECONDS", "600"))  # default 10 minutes

# token -> {"user_id": int, "exp": int(epoch seconds), "cached_at": float, "user_obj": User | None}
_TOKEN_CACHE: Dict[str, Dict[str, Any]] = {}



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
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=ACCESS_TOKEN_EXPIRE_MINUTES * 60,  # seconds
        samesite="lax",
        secure=False,  # set True if served over HTTPS
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

    # Fast path: use cached decode if within TTL
    if cache_entry and (now - cache_entry["cached_at"]) < TOKEN_CACHE_TTL_SECONDS:
        # Check expiration without re-decoding
        if now >= cache_entry["exp"]:
            # Expired: purge and raise
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="Token expired")
        user_obj: User | None = cache_entry.get("user_obj")
        if user_obj is None:
            user_obj = session.exec(select(User).where(User.id == int(cache_entry["user_id"]))).first()
            if not user_obj:
                _TOKEN_CACHE.pop(token, None)
                raise HTTPException(status_code=401, detail="User not found")
            cache_entry["user_obj"] = user_obj  # store for subsequent use
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

    # Store / refresh cache
    _TOKEN_CACHE[token] = {
        "user_id": int(user_id),
        "exp": int(exp),
        "cached_at": now,
        "user_obj": user,
    }
    return user

router = APIRouter()

@router.post("/validate-registration", response_model=MessageResponse)
def validate_registration(user_in: UserCreate, session: Session = Depends(get_session)) -> MessageResponse:
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing and existing.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        validate_username(user_in.name)
        validate_password(user_in.password)
        validate_email_domain(user_in.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return MessageResponse(message="Registration data is valid")


@router.post("/register", response_model=MessageResponse, status_code=status.HTTP_202_ACCEPTED)
def register_user(
    user_in: UserCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
) -> MessageResponse:
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing and existing.is_verified:
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        validate_username(user_in.name)
        validate_password(user_in.password)
        validate_email_domain(user_in.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    verification_code = generate_verification_code()
    verification_hash = hash_password(verification_code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=EMAIL_CODE_EXPIRATION_MINUTES)

    if existing and not existing.is_verified:
        existing.name = user_in.name
        existing.hashed_password = hash_password(user_in.password)
        existing.is_verified = False
        user = existing
    else:
        user = User(
            email=user_in.email,
            name=user_in.name,
            hashed_password=hash_password(user_in.password),
            is_verified=False,
        )
        session.add(user)

    session.flush()

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

    # Auto-create empty profile with university derived from email domain
    try:
        domain = user.email.split('@', 1)[1].lower()
    except Exception:
        domain = None
    university = None
    # Naive derivation: transform domain (remove subdomains) e.g., cs.uni.edu -> uni.edu
    if domain:
        parts = domain.split('.')
        if len(parts) >= 2:
            university = '.'.join(parts[-2:])  # simple fallback; can be replaced with dataset mapping

    profile = StudentProfile(
        user_id=user.id,
        university=university,
        username=user.name  # initialize profile username from user creation
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)

    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)

    background_tasks.add_task(send_verification_email, user.email, verification_code, user.name)

    return MessageResponse(message="Verification code sent to your email")

@router.post("/login", response_model=UserRead)
def login_user(login_data: UserLogin, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_verified:
        raise HTTPException(status_code=403, detail="Email not verified")
    
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

@router.post("/logout")
def logout_user(response: Response):
    delete_auth_cookie(response)
    return {"message": "Logged out successfully"}

@router.get("/me", response_model=UserRead)
def get_current_user(request: Request, session: Session = Depends(get_session)):
    user = get_user_from_token(request, session)
    return user

@router.get("/", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    return session.exec(select(User)).all()
