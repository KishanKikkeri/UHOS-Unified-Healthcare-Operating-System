"""
Phase 11 — Authentication & RBAC.

POST /auth/login  — issue a JWT for valid demo-seeded credentials.
POST /auth/logout — stateless JWT, so this is a client-instruction
                     endpoint (discard the token) plus an audit-friendly
                     200 response; no server-side session to invalidate.
GET  /auth/me      — resolve the current bearer token to its user profile.
GET  /auth/users   — district_admin-only directory of accounts, useful
                     for an admin screen later; gated by require_roles.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.user import User
from app.models.models import PHC
from app.schemas.auth import LoginRequest, DemoLoginRequest, TokenResponse, UserOut, LogoutResponse
from app.services.auth import authenticate_user, get_user_by_username
from app.utils.security import create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.utils.rbac import ROLE_HOME_ROUTE, is_valid_role
from app.utils.demo import is_demo_mode_enabled, DEMO_ROLE_USERNAME
from app.middleware.auth import get_current_user, require_roles

router = APIRouter(prefix="/auth", tags=["auth"])


def _to_user_out(db: Session, user: User) -> UserOut:
    facility_name = None
    if user.facility_id is not None:
        phc = db.query(PHC).filter(PHC.id == user.facility_id).first()
        facility_name = phc.name if phc else None
    return UserOut(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        facility_id=user.facility_id,
        facility_name=facility_name,
        doctor_id=user.doctor_id,
        patient_id=user.patient_id,
    )


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate_user(db, payload.username, payload.password)
    if user is None:
        # Deliberately identical message for "no such user" and "wrong
        # password" so the API never confirms a username's existence.
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "username": user.username})
    return TokenResponse(
        access_token=token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_to_user_out(db, user),
    )


@router.post("/demo-login", response_model=TokenResponse)
def demo_login(payload: DemoLoginRequest, db: Session = Depends(get_db)):
    """
    Phase 12 — Demo Mode. One-click role login for hackathon judges:
    no username/password, just a role. Deliberately reuses the exact same
    JWT issuance and TokenResponse shape as POST /auth/login, so nothing
    downstream (AuthGuard, RBAC, the frontend's AuthContext) has to know
    the difference between a real login and a demo one.

    Gated by the DEMO_MODE env var so this can't be used to bypass
    credentials in a real deployment -- see PHASE12_DEMO_MODE_HANDOVER.md.
    """
    if not is_demo_mode_enabled():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo Mode is disabled. Set DEMO_MODE=true to enable it.",
        )

    if not is_valid_role(payload.role):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown role '{payload.role}'",
        )

    username = DEMO_ROLE_USERNAME[payload.role]
    user = get_user_by_username(db, username)
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Demo account for role '{payload.role}' is not seeded. Run seed.demo_seed.",
        )

    token = create_access_token({"sub": str(user.id), "role": user.role, "username": user.username})
    return TokenResponse(
        access_token=token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=_to_user_out(db, user),
    )


@router.get("/demo-status")
def demo_status():
    """Lets the frontend confirm the backend's own DEMO_MODE flag if it
    ever wants to (currently the frontend reads its own
    NEXT_PUBLIC_DEMO_MODE env var independently, per the handover doc)."""
    return {"demo_mode": is_demo_mode_enabled()}


@router.post("/logout", response_model=LogoutResponse)
def logout(current_user: User = Depends(get_current_user)):
    # Stateless JWT: nothing to invalidate server-side in this build.
    # Documented as a known limitation in PHASE11_AUTH_HANDOVER.md --
    # a production deployment would add a short-lived token blocklist.
    return LogoutResponse()


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _to_user_out(db, current_user)


@router.get("/users", response_model=list[UserOut])
def list_users(
    current_user: User = Depends(require_roles("district_admin")),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.role, User.username).all()
    return [_to_user_out(db, u) for u in users]


@router.get("/role-routes")
def role_routes():
    """Small convenience endpoint mirroring app/utils/rbac.py's
    ROLE_HOME_ROUTE, so the frontend's redirect map can be sanity-checked
    against the backend's if it's ever fetched instead of hardcoded."""
    return ROLE_HOME_ROUTE
