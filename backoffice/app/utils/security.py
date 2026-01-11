import os, secrets
from datetime import datetime, timedelta, timezone
from ..config import FRONT_BASE_URL

def generate_temp_password(length: int = 12) -> str:
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*"
    return "".join(secrets.choice(alphabet) for _ in range(length))

def generate_reset_token() -> str:
    return secrets.token_urlsafe(32)

def reset_expiry(hours: int = 2) -> datetime:
    return datetime.now(timezone.utc) + timedelta(hours=hours)

def reset_link(token: str) -> str:
    return f"{FRONT_BASE_URL}/login/reset?token={token}"
