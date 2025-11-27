"""Security helpers for password hashing/verification using bcrypt>=4.

This module avoids passlib and interacts directly with the 'bcrypt' package,
so it works with bcrypt 4.x where __about__.__version__ was removed.

API:
- hash_password(plain: str) -> str: returns a UTF-8 string hash (modular crypt format)
- verify_password(plain: str, hashed: str) -> bool
- get_current_user: Dependency for FastAPI routes to get authenticated user
"""
from __future__ import annotations

import bcrypt
from fastapi import Request, Depends, HTTPException
from sqlmodel import Session, select
import jwt
import time
import os
from dotenv import load_dotenv

from app.db import get_session
from app.models import User

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET", "").strip()
ALGORITHM = os.getenv("JWT_ALGORITHM", "").strip()
if not SECRET_KEY or not ALGORITHM:
    raise RuntimeError("JWT_SECRET or JWT_ALGORITHM missing in environment")

TOKEN_CACHE_TTL_SECONDS = int(os.getenv("JWT_CACHE_TTL_SECONDS", "600"))
_TOKEN_CACHE = {}


def hash_password(plain_password: str) -> str:
    if plain_password is None:
        raise ValueError("Password cannot be None")
    # bcrypt requires bytes; generate a salt with default rounds (12)
    salt = bcrypt.gensalt()  # cost is configurable via rounds=12,14,...
    hashed: bytes = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    # Store as utf-8 string (starts with $2b$...)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if plain_password is None or hashed_password is None:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except ValueError:
        # Raised if the hash format is invalid/corrupted
        return False


def get_user_from_token(request: Request, session: Session) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    now = time.time()
    cache_entry = _TOKEN_CACHE.get(token)

    if cache_entry and (now - cache_entry["cached_at"]) < TOKEN_CACHE_TTL_SECONDS:
        if now >= cache_entry["exp"]:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="Token expired")
        user_id = cache_entry.get("user_id")
        if user_id is None:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="Invalid token cache entry")
        user_obj = session.exec(select(User).where(User.id == int(user_id))).first()
        if not user_obj:
            _TOKEN_CACHE.pop(token, None)
            raise HTTPException(status_code=401, detail="User not found")
        return user_obj

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

    if now >= exp:
        raise HTTPException(status_code=401, detail="Token expired")

    user = session.exec(select(User).where(User.id == int(user_id))).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    _TOKEN_CACHE[token] = {
        "user_id": user_id,
        "exp": exp,
        "cached_at": now
    }

    return user


def get_current_user(request: Request, session: Session = Depends(get_session)) -> User:
    return get_user_from_token(request, session)
