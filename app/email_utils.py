from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASS = os.getenv("SMTP_PASS")
APP_URL = os.getenv("APP_URL", "http://localhost:5173")


def _ensure_config() -> None:
    if not SMTP_HOST or not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("SMTP credentials are not fully configured")


def send_verification_email(recipient: str, code: str, recipient_name: Optional[str] = None) -> None:
    _ensure_config()

    message = EmailMessage()
    message["Subject"] = "Your Mosaic verification code"
    message["From"] = SMTP_USER
    message["To"] = recipient

    greeting = f"Hi {recipient_name}," if recipient_name else "Hello,"  # styling if name provided
    message.set_content(
        (
            f"{greeting}\n\n"
            "Thanks for creating a Mosaic account. To finish signing up, enter the verification code below within"
            " the next 15 minutes.\n\n"
            f"Verification code: {code}\n\n"
            f"If you didn't request this, you can safely ignore this email.\n\n"
            f"Need help? Visit {APP_URL}.\n\n"
            "— The Mosaic Team"
        )
    )

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(message)
