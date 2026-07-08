"""
Phase 12 — Demo Mode tests.

Uses monkeypatch.setenv("DEMO_MODE", ...) around each test since
app/utils/demo.py reads the env var dynamically (not cached at import
time) specifically so tests can flip it per-test without reimporting.
"""
import pytest

from app.models.user import User
from app.utils.security import hash_password
from app.utils.demo import DEMO_ROLE_USERNAME
from app.utils.rbac import ROLES


def seed_demo_user(db_session, username, role):
    user = User(
        username=username,
        hashed_password=hash_password("irrelevant-for-demo-login"),
        full_name=f"Demo {role}",
        role=role,
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture(autouse=True)
def demo_mode_on(monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    yield


def test_demo_login_succeeds_for_seeded_role(client, db_session):
    seed_demo_user(db_session, DEMO_ROLE_USERNAME["doctor"], "doctor")

    res = client.post("/auth/demo-login", json={"role": "doctor"})
    assert res.status_code == 200
    body = res.json()
    assert body["access_token"]
    assert body["user"]["role"] == "doctor"
    assert body["user"]["username"] == DEMO_ROLE_USERNAME["doctor"]


@pytest.mark.parametrize("role", ROLES)
def test_demo_login_works_for_every_role(client, db_session, role):
    seed_demo_user(db_session, DEMO_ROLE_USERNAME[role], role)

    res = client.post("/auth/demo-login", json={"role": role})
    assert res.status_code == 200
    assert res.json()["user"]["role"] == role


def test_demo_login_rejects_invalid_role(client, db_session):
    res = client.post("/auth/demo-login", json={"role": "super_admin"})
    assert res.status_code == 400


def test_demo_login_404s_when_demo_account_not_seeded(client, db_session):
    # DEMO_ROLE_USERNAME["citizen"] deliberately not seeded in this test.
    res = client.post("/auth/demo-login", json={"role": "citizen"})
    assert res.status_code == 404


def test_demo_login_issues_a_working_jwt(client, db_session):
    seed_demo_user(db_session, DEMO_ROLE_USERNAME["district_admin"], "district_admin")

    login_res = client.post("/auth/demo-login", json={"role": "district_admin"})
    token = login_res.json()["access_token"]

    me_res = client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200
    assert me_res.json()["role"] == "district_admin"


def test_demo_login_disabled_when_demo_mode_off(client, db_session, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "false")
    seed_demo_user(db_session, DEMO_ROLE_USERNAME["doctor"], "doctor")

    res = client.post("/auth/demo-login", json={"role": "doctor"})
    assert res.status_code == 403


def test_demo_login_default_is_enabled_without_env_var(client, db_session, monkeypatch):
    monkeypatch.delenv("DEMO_MODE", raising=False)
    seed_demo_user(db_session, DEMO_ROLE_USERNAME["doctor"], "doctor")

    res = client.post("/auth/demo-login", json={"role": "doctor"})
    assert res.status_code == 200


def test_demo_status_endpoint_reflects_env_var(client, monkeypatch):
    monkeypatch.setenv("DEMO_MODE", "true")
    assert client.get("/auth/demo-status").json() == {"demo_mode": True}

    monkeypatch.setenv("DEMO_MODE", "false")
    assert client.get("/auth/demo-status").json() == {"demo_mode": False}


def test_real_login_and_rbac_untouched_by_demo_mode(client, db_session):
    """Phase 12 must be additive -- the real credentialed login and its
    401-on-wrong-password behavior keep working exactly as in Phase 11."""
    seed_demo_user(db_session, "someone", "district_admin")

    res = client.post("/auth/login", json={"username": "someone", "password": "wrong"})
    assert res.status_code == 401
