"""Security helpers for password hashing/verification using bcrypt>=4.

This module avoids passlib and interacts directly with the 'bcrypt' package,
so it works with bcrypt 4.x where __about__.__version__ was removed.

API:
- hash_password(plain: str) -> str: returns a UTF-8 string hash (modular crypt format)
- verify_password(plain: str, hashed: str) -> bool
"""
from __future__ import annotations

import bcrypt


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
