"""Citizen Health App smoke tests: patient search and prescription-linked retrieval."""


def test_patient_search(client, seeded_db):
    resp = client.get("/patients", params={"search": "Test Patient"})
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()]
    assert seeded_db["patient"].name in names


def test_prescription_retrieval_via_history(client, seeded_db):
    create_resp = client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 2}],
        },
    )
    assert create_resp.status_code == 200

    history_resp = client.get(f"/patients/{seeded_db['patient'].id}/history")
    assert history_resp.status_code == 200
    prescriptions = history_resp.json()["prescriptions"]
    assert len(prescriptions) == 1
    assert prescriptions[0]["doctor_id"] == seeded_db["doc_a"].id
