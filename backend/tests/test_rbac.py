"""
Phase 11 — RBAC tests.

Exercises app/middleware/auth.py's `require_roles` guard via the one
Phase 11 endpoint that uses it (GET /auth/users, district_admin-only),
plus direct unit tests of the guard factory itself so every role
combination is covered without needing one HTTP endpoint per role.
"""
import pytest
from fastapi import HTTPException

from app.models.user import User
from app.utils.security import hash_password
from app.utils.rbac import ROLES, ROLE_HOME_ROUTE, is_valid_role
from app.middleware.auth import require_roles


def make_user(db_session, username, role, password="pass123"):
    user = User(
        username=username,
        hashed_password=hash_password(password),
        full_name=f"{role} test user",
        role=role,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.mark.parametrize("role", ROLES)
def test_every_role_has_a_home_route(role):
    assert role in ROLE_HOME_ROUTE
    assert ROLE_HOME_ROUTE[role].startswith("/")


def test_is_valid_role():
    assert is_valid_role("district_admin") is True
    assert is_valid_role("super_admin") is False


def test_require_roles_allows_matching_role(db_session):
    user = make_user(db_session, "u_allow", "district_admin")
    guard = require_roles("district_admin", "facility_admin")
    result = guard(current_user=user)
    assert result is user


def test_require_roles_blocks_non_matching_role(db_session):
    user = make_user(db_session, "u_block", "doctor")
    guard = require_roles("district_admin")
    with pytest.raises(HTTPException) as exc_info:
        guard(current_user=user)
    assert exc_info.value.status_code == 403


def test_users_endpoint_allows_district_admin(client, db_session):
    make_user(db_session, "rbac_admin", "district_admin", password="secret1")
    login = client.post("/auth/login", json={"username": "rbac_admin", "password": "secret1"})
    token = login.json()["access_token"]

    res = client.get("/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert isinstance(res.json(), list)


@pytest.mark.parametrize(
    "role", ["facility_admin", "doctor", "pharmacist", "lab_technician", "citizen"]
)
def test_users_endpoint_blocks_every_non_admin_role(client, db_session, role):
    make_user(db_session, f"rbac_{role}", role, password="secret1")
    login = client.post("/auth/login", json={"username": f"rbac_{role}", "password": "secret1"})
    token = login.json()["access_token"]

    res = client.get("/auth/users", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 403


def test_users_endpoint_requires_auth_at_all(client, db_session):
    res = client.get("/auth/users")
    assert res.status_code == 401


def test_role_routes_endpoint_public(client, db_session):
    res = client.get("/auth/role-routes")
    assert res.status_code == 200
    body = res.json()
    for role in ROLES:
        assert role in body
