"""
Shared pytest fixtures for the full backend smoke/regression suite.

Design:
- Each test gets a brand-new, isolated SQLite file DB (not the dev uhos.db),
  so tests are deterministic and never touch real/demo data.
- `client` overrides the app's `get_db` dependency to use that isolated
  session, per FastAPI's recommended testing pattern.
- `seeded_db` populates a small, fixed dataset (facilities, doctors,
  medicines, inventory, a patient) that mirrors seed/seed_data.py's shape
  closely enough for every module's smoke tests to exercise real code
  paths without depending on the actual seed script or network access.
"""
import os
import sys
import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.database import Base, get_db  # noqa: E402
from app.models import models as m  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture()
def db_session(tmp_path):
    db_path = tmp_path / f"test_{uuid.uuid4().hex}.db"
    engine = create_engine(
        f"sqlite:///{db_path}", connect_args={"check_same_thread": False}
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)

    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        engine.dispose()


@pytest.fixture()
def client(db_session, monkeypatch):
    def _override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = _override_get_db

    # routes_ws.py intentionally opens its own short-lived sessions via
    # SessionLocal (see its module docstring) rather than the get_db
    # dependency, so it isn't covered by the override above. Point it at
    # the same isolated test engine used by db_session for this test only,
    # so the WebSocket smoke tests see the same data the REST calls write.
    test_engine = db_session.get_bind()
    TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    monkeypatch.setattr("app.api.routes_ws.SessionLocal", TestSessionLocal)

    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def seeded_db(db_session):
    """
    Deterministic, minimal-but-realistic dataset: 2 facilities, 2 doctors,
    2 medicines, uneven inventory (so redistribution has a real gap to
    find), 1 patient. Every module's smoke tests build on this.
    """
    phc_a = m.PHC(name="PHC Test Alpha", district="Mysuru", type="PHC", lat=12.30, lng=76.60)
    phc_b = m.PHC(name="PHC Test Beta", district="Mysuru", type="PHC", lat=12.34, lng=76.62)
    db_session.add_all([phc_a, phc_b])
    db_session.commit()

    doc_a = m.Doctor(name="Dr. Alpha", specialization="General Medicine", phc_id=phc_a.id, status="active")
    doc_b = m.Doctor(name="Dr. Beta", specialization="Pediatrics", phc_id=phc_b.id, status="active")
    db_session.add_all([doc_a, doc_b])
    db_session.commit()

    med_low = m.Medicine(name="TestMed Low", unit="tablets")
    med_high = m.Medicine(name="TestMed High", unit="tablets")
    db_session.add_all([med_low, med_high])
    db_session.commit()

    # phc_a is low on med_low (should trigger redistribution/critical logic),
    # phc_b has surplus of med_low, and healthy stock of med_high everywhere.
    db_session.add_all([
        m.Inventory(phc_id=phc_a.id, medicine_id=med_low.id, stock_qty=2),
        m.Inventory(phc_id=phc_a.id, medicine_id=med_high.id, stock_qty=500),
        m.Inventory(phc_id=phc_b.id, medicine_id=med_low.id, stock_qty=500),
        m.Inventory(phc_id=phc_b.id, medicine_id=med_high.id, stock_qty=500),
    ])
    db_session.commit()

    patient = m.Patient(name="Test Patient", dob="1990-01-01", phc_home_id=phc_a.id)
    db_session.add(patient)
    db_session.commit()

    return {
        "phc_a": phc_a,
        "phc_b": phc_b,
        "doc_a": doc_a,
        "doc_b": doc_b,
        "med_low": med_low,
        "med_high": med_high,
        "patient": patient,
    }
