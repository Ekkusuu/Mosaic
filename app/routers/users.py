# app/routers/users.py
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from sqlmodel import Session, select
from app.security import hash_password, verify_and_optionally_rehash
from app.db import get_session
from app.models import User, UserCreate, UserRead, UserLogin, StudentProfile
from app.validators import validate_username, validate_password, validate_email_domain
from datetime import datetime, timedelta, timezone
import jwt
import os
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

@router.post("/register", response_model=UserRead)
def register_user(user_in: UserCreate, response: Response, session: Session = Depends(get_session)):
    # check if email exists
    existing = session.exec(select(User).where(User.email == user_in.email)).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # validations
    try:
        validate_username(user_in.name)
        validate_password(user_in.password)
        validate_email_domain(user_in.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    user = User(
        email=user_in.email,
        name=user_in.name,
        hashed_password=hash_password(user_in.password)
    )
    session.add(user)
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

    return user

@router.post("/login", response_model=UserRead)
def login_user(login_data: UserLogin, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == login_data.email)).first()
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    verified, maybe_new_hash = verify_and_optionally_rehash(login_data.password, user.hashed_password)
    if not verified:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if maybe_new_hash:
        # Upgrade stored hash (cost factor increased)
        user.hashed_password = maybe_new_hash
        session.add(user)
        session.commit()
        session.refresh(user)
    
    token = create_access_token(data={"sub": str(user.id)})
    set_auth_cookie(response, token)
    
    return user

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
