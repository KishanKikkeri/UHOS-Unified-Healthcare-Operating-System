"""Patient history smoke tests: unified prescription + dispensing view."""


def test_history_retrieval(client, seeded_db):
    client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 3}],
        },
    )
    resp = client.get(f"/patients/{seeded_db['patient'].id}/history")
    assert resp.status_code == 200
    body = resp.json()
    assert body["patient_id"] == seeded_db["patient"].id
    assert len(body["prescriptions"]) == 1
    assert body["prescriptions"][0]["items"][0]["medicine"] == seeded_db["med_high"].name


def test_history_empty_for_new_patient(client, seeded_db):
    resp = client.get(f"/patients/{seeded_db['patient'].id}/history")
    assert resp.status_code == 200
    body = resp.json()
    assert body["prescriptions"] == []
    assert body["appointments"] == []
