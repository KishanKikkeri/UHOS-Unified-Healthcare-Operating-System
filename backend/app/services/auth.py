"""
Phase 11 — Authentication & RBAC.

Thin service layer, same shape as the rest of app/services/*: plain
functions taking a `Session`, no framework/request objects here (those
stay in api/routes_auth.py and middleware/auth.py).
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.models.user import User
from app.utils.security import verify_password


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """Returns the User if username exists, is active, and password matches.
    Returns None on any failure -- routes_auth.py maps that uniformly to a
    401 "Incorrect username or password" so we never leak which half failed.
    """
    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
