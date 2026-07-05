"""Doctor Workspace smoke tests: prescription creation happy path + validation failures."""


def test_prescription_creation(client, seeded_db):
    resp = client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 5}],
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["patient_id"] == seeded_db["patient"].id
    assert len(body["outcomes"]) == 1


def test_validation_fails_for_absent_doctor(client, seeded_db, db_session):
    seeded_db["doc_a"].status = "absent"
    db_session.commit()

    resp = client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 5}],
        },
    )
    assert resp.status_code == 400


def test_validation_fails_for_unknown_doctor(client, seeded_db):
    resp = client.post(
        "/prescriptions",
        json={
            "doctor_id": 999999,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 5}],
        },
    )
    assert resp.status_code == 404


def test_validation_fails_for_nonpositive_quantity(client, seeded_db):
    resp = client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 0}],
        },
    )
    assert resp.status_code == 422
