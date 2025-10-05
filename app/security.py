"""Security helpers for password hashing / verification using bcrypt>=4.

Features:
* Direct use of `bcrypt` package (no passlib dependency required).
* Configurable cost factor via env BCRYPT_ROUNDS (default 12).
* Verification compatible with legacy bcrypt hashes that still follow
    the standard modular crypt format ($2a$ / $2b$ / $2y$ ...).
* Automatic rehash-on-login when cost factor is lower than configured.

API:
        hash_password(plain: str) -> str
        verify_password(plain: str, hashed: str) -> bool
        verify_and_optionally_rehash(plain: str, hashed: str) -> tuple[bool, str | None]

`verify_and_optionally_rehash` returns (verified, new_hash_if_upgraded).
Callers can store the new hash if not None.
"""
from __future__ import annotations

import bcrypt
import os
import re
from typing import Tuple, Optional

BCRYPT_ROUNDS = int(os.getenv("BCRYPT_ROUNDS", "12"))
_BCRYPT_COST_RE = re.compile(r"^\$(?:2[aby])\$(\d\d)\$")  # captures cost


def hash_password(plain_password: str) -> str:
    if plain_password is None:
        raise ValueError("Password cannot be None")
    if not isinstance(plain_password, str):  # defensive
        raise TypeError("Password must be a string")
    # bcrypt requires bytes; configurable cost
    salt = bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    hashed: bytes = bcrypt.hashpw(plain_password.encode("utf-8"), salt)
    return hashed.decode("utf-8")  # $2b$...


def _extract_cost(hashed_password: str) -> Optional[int]:
    match = _BCRYPT_COST_RE.match(hashed_password)
    if not match:
        return None
    try:
        return int(match.group(1))
    except ValueError:
        return None

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Simple verification wrapper."""
    if plain_password is None or hashed_password is None:
        return False
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except Exception:
        return False

def verify_and_optionally_rehash(plain_password: str, hashed_password: str) -> Tuple[bool, Optional[str]]:
    """Verify password and decide if rehash needed (cost factor upgrade).

    Returns (verified, new_hash_or_None).
    """
    ok = verify_password(plain_password, hashed_password)
    if not ok:
        return False, None
    current_cost = _extract_cost(hashed_password) or 0
    if current_cost < BCRYPT_ROUNDS:
        # Rehash with stronger cost
        return True, hash_password(plain_password)
    return True, None
