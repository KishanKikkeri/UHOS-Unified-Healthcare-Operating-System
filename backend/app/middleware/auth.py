"""
Phase 11 — Authentication & RBAC.

FastAPI dependency-based "middleware" (the idiomatic FastAPI way to guard
routes, rather than a literal ASGI middleware) providing:

  - get_current_user: resolves the bearer token -> User row, 401 on any
    failure (missing header, expired/invalid token, deleted user).
  - require_roles(*roles): a dependency factory for role-gated endpoints,
    403 if the current user's role isn't in the allowed set.

Existing routers (routes_dashboard.py, routes_prescriptions.py, etc.) are
NOT modified to require these -- this phase is purely additive on the
backend; RBAC for the existing dashboard/operations data is enforced on
the frontend (route guards + hidden nav), matching the handover doc's
"do not break existing APIs" rule. `require_roles` is available for any
new Phase 11 endpoint (e.g. GET /auth/users) that does need it.
"""
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.services.auth import get_user_by_id
from app.utils.security import decode_access_token, TokenError

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_access_token(credentials.credentials)
    except TokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    user = get_user_by_id(db, int(user_id)) if user_id is not None else None
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_roles(*allowed_roles: str):
    def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not permitted to perform this action",
            )
        return current_user

    return _guard
