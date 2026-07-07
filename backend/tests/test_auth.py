"""
Phase 11 — Authentication tests.

Uses the same `client`/`db_session` fixtures as every other test module
(tests/conftest.py) -- an isolated in-memory-style SQLite DB per test, so
nothing here touches the real demo uhos.db.
"""
import time

from app.models.user import User
from app.utils.security import hash_password, create_access_token, decode_access_token, TokenError


def make_user(db_session, username="doc01", password="pass123", role="doctor", **kw):
    user = User(
        username=username,
        hashed_password=hash_password(password),
        full_name=kw.pop("full_name", "Test User"),
        role=role,
        **kw,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def test_login_success(client, db_session):
    make_user(db_session, username="admin1", password="secret1", role="district_admin")

    res = client.post("/auth/login", json={"username": "admin1", "password": "secret1"})
    assert res.status_code == 200
    body = res.json()
    assert body["token_type"] == "bearer"
    assert body["access_token"]
    assert body["user"]["username"] == "admin1"
    assert body["user"]["role"] == "district_admin"
    # Password hash should never be echoed back.
    assert "password" not in body["user"]
    assert "hashed_password" not in body["user"]


def test_login_wrong_password(client, db_session):
    make_user(db_session, username="admin2", password="correct-pass")

    res = client.post("/auth/login", json={"username": "admin2", "password": "wrong-pass"})
    assert res.status_code == 401
    assert res.json()["detail"] == "Incorrect username or password"


def test_login_unknown_username(client, db_session):
    res = client.post("/auth/login", json={"username": "nobody", "password": "whatever"})
    assert res.status_code == 401
    # Same message as wrong-password -- never confirms whether the
    # username exists.
    assert res.json()["detail"] == "Incorrect username or password"


def test_login_inactive_user_rejected(client, db_session):
    make_user(db_session, username="disabled_user", password="secret1", is_active=False)

    res = client.post("/auth/login", json={"username": "disabled_user", "password": "secret1"})
    assert res.status_code == 401


def test_me_requires_token(client, db_session):
    res = client.get("/auth/me")
    assert res.status_code == 401


def test_me_returns_current_user(client, db_session):
    make_user(db_session, username="doctor_x", password="pw12345", role="doctor")
    login = client.post("/auth/login", json={"username": "doctor_x", "password": "pw12345"})
    token = login.json()["access_token"]

    res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert res.json()["username"] == "doctor_x"


def test_me_rejects_garbage_token(client, db_session):
    res = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert res.status_code == 401


def test_logout_requires_auth_then_succeeds(client, db_session):
    make_user(db_session, username="logout_user", password="pw12345")
    login = client.post("/auth/login", json={"username": "logout_user", "password": "pw12345"})
    token = login.json()["access_token"]

    unauth = client.post("/auth/logout")
    assert unauth.status_code == 401

    res = client.post("/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 200
    assert "detail" in res.json()


def test_token_expiry():
    """Unit-level check of the JWT helpers themselves (no HTTP round trip):
    a token minted with a negative expiry is already expired."""
    token = create_access_token({"sub": "1", "role": "doctor"}, expires_minutes=-1)
    try:
        decode_access_token(token)
        assert False, "expected an expired token to raise"
    except TokenError as exc:
        assert "expired" in str(exc).lower()


def test_existing_api_unaffected_by_auth_module(client, db_session):
    """Phase 11 must be additive -- an unauthenticated request to a
    pre-existing Phase <11 endpoint must keep working exactly as before."""
    res = client.get("/district/alerts")
    assert res.status_code == 200
