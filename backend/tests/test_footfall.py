"""Patient Footfall smoke tests: daily statistics rollup."""
from datetime import datetime, timedelta


def test_daily_statistics(client, db_session, seeded_db):
    from app.models.models import Appointment

    now = datetime.utcnow()
    db_session.add_all([
        Appointment(
            patient_id=seeded_db["patient"].id, doctor_id=seeded_db["doc_a"].id,
            phc_id=seeded_db["phc_a"].id, scheduled_at=now,
        ),
        Appointment(
            patient_id=seeded_db["patient"].id, doctor_id=seeded_db["doc_a"].id,
            phc_id=seeded_db["phc_a"].id, scheduled_at=now - timedelta(hours=2),
        ),
    ])
    db_session.commit()

    resp = client.get(f"/phcs/{seeded_db['phc_a'].id}/footfall")
    assert resp.status_code == 200
    body = resp.json()
    assert body["today_patients"] == 2
    assert body["weekly_total"] >= 2
    assert "calculation" in body


def test_footfall_empty_state(client, seeded_db):
    resp = client.get(f"/phcs/{seeded_db['phc_b'].id}/footfall")
    assert resp.status_code == 200
    body = resp.json()
    assert body["today_patients"] == 0
    assert body["peak_hour"] is None
