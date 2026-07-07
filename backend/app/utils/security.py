"""
Phase 11 — Authentication & RBAC.

Small, dependency-light security helpers:
  - bcrypt password hashing directly via `bcrypt` (no passlib, one fewer
    dependency, same underlying algorithm).
  - JWT access tokens via PyJWT (HS256, single shared secret -- fine for
    a single-service demo deployment; documented as a known limitation).
"""
import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt

# ADR-style note (mirrors backend/app/db/database.py's own pattern): read
# from env with a safe local-dev default so the app runs with zero setup.
# For a real deployment, JWT_SECRET_KEY MUST be set to a long random value.
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "uhos-dev-secret-change-me-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))  # 8h shift


def hash_password(plain_password: str) -> str:
    return bcrypt.hashpw(plain_password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def create_access_token(data: dict, expires_minutes: Optional[int] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes if expires_minutes is not None else ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)


class TokenError(Exception):
    pass


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise TokenError("Token has expired")
    except jwt.InvalidTokenError:
        raise TokenError("Invalid token")
