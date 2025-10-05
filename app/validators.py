"""Validation utilities for user registration.

Loads allowed academic email domains from the universities.json dataset
and provides functions to validate username, password strength, and
whether an email's domain is in the allowed list.
"""
from __future__ import annotations

from pathlib import Path
import json
import re
from functools import lru_cache

# Relative paths for this repository layout:
# - This file: app/validators.py
# - universities.json: app/assets/universities.json
UNIVERSITIES_JSON_PATH = Path(__file__).resolve().parent / "assets" / "universities.json"

USERNAME_PATTERN = re.compile(r"^[A-Za-z0-9._-]{3,30}$")

SPECIAL_CHARS = r"!@#$%^&*(),.?\":{}|<>_+-"  # used for explanation only
PASSWORD_RULES = [
    (re.compile(r".{8,}"), "at least 8 characters"),
    (re.compile(r"[A-Z]"), "an uppercase letter"),
    (re.compile(r"[a-z]"), "a lowercase letter"),
    (re.compile(r"[0-9]"), "a digit"),
    (re.compile(r"[!@#$%^&*(),.?\":{}|<>_+\-]"), "a special character"),
]


def _extract_domains_from_entry(entry: dict) -> set[str]:
    domains: set[str] = set()
    # Common key in public university datasets is 'domains'
    if isinstance(entry, dict):
        raw = entry.get("domains")
        if isinstance(raw, list):
            for d in raw:
                if isinstance(d, str):
                    d = d.strip().lower()
                    if d:
                        domains.add(d)
    return domains


@lru_cache()
def get_allowed_email_domains() -> set[str]:
    if not UNIVERSITIES_JSON_PATH.exists():
        return set()  # no restriction if file absent
    try:
        data = json.loads(UNIVERSITIES_JSON_PATH.read_text(encoding="utf-8"))
    except Exception:
        return set()
    allowed: set[str] = set()
    if isinstance(data, list):
        for entry in data:
            allowed |= _extract_domains_from_entry(entry)
    return allowed


def validate_username(username: str):
    if not USERNAME_PATTERN.fullmatch(username or ""):
        raise ValueError(
            "Username must be 3-30 characters and contain only letters, numbers, '.', '_' or '-'"
        )


def validate_password(password: str):
    missing = [human for regex, human in PASSWORD_RULES if not regex.search(password or "")]
    if missing:
        raise ValueError("Password missing: " + ", ".join(missing))


def email_domain_allowed(email: str) -> bool:
    if "@" not in email:
        return False
    domain = email.split("@", 1)[1].lower()
    allowed = get_allowed_email_domains()
    # If allowed set empty => treat as unrestricted (development convenience)
    if not allowed:
        return True
    # Accept exact match or subdomain of an allowed domain
    for d in allowed:
        if domain == d or domain.endswith("." + d):
            return True
    return False


def validate_email_domain(email: str):
    if not email_domain_allowed(email):
        raise ValueError("Only university email addresses are allowed.")
