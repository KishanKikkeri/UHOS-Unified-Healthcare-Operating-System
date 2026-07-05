"""
Event Engine smoke tests: every module that's supposed to write to the
append-only `events` table (ARCHITECTURE_DECISIONS.md #001) actually does.
"""


def _event_types(client):
    return [e["event_type"] for e in client.get("/events/recent", params={"limit": 100}).json()]


def test_prescription_emits_event(client, seeded_db):
    client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 1}],
        },
    )
    types = _event_types(client)
    assert "prescription_created" in types


def test_medicine_dispensed_emits_event(client, seeded_db):
    client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 1}],
        },
    )
    types = _event_types(client)
    assert "medicine_dispensed" in types


def test_attendance_recorded_emits_event(client, seeded_db):
    client.post(f"/doctors/{seeded_db['doc_a'].id}/attendance", json={"status": "present"})
    types = _event_types(client)
    assert "doctor_checked_in" in types


def test_bed_alert_emits_event(client, seeded_db):
    client.put(
        f"/phcs/{seeded_db['phc_a'].id}/beds",
        json={"total": 10, "occupied": 10, "reserved": 0},
    )
    types = _event_types(client)
    assert "bed_occupancy_updated" in types
    assert "bed_occupancy_critical" in types


def test_test_unavailable_emits_event(client, seeded_db):
    client.put(
        f"/phcs/{seeded_db['phc_a'].id}/tests",
        json={"test_name": "CBC", "available": False},
    )
    types = _event_types(client)
    assert "test_availability_changed" in types
