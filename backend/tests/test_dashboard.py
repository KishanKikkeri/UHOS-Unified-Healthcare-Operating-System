"""Dashboard endpoint smoke tests: alerts, facility scores, event timeline."""


def test_alerts_endpoint(client, seeded_db):
    # Trigger a critical alert by prescribing more than phc_a's med_low stock.
    client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_low"].id, "quantity": 2}],
        },
    )
    resp = client.get(f"/phcs/{seeded_db['phc_a'].id}/alerts")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)

    district_resp = client.get("/district/alerts")
    assert district_resp.status_code == 200


def test_facility_endpoint(client, seeded_db):
    resp = client.get("/district/facilities")
    assert resp.status_code == 200
    names = [f["name"] for f in resp.json()]
    assert seeded_db["phc_a"].name in names
    assert seeded_db["phc_b"].name in names


def test_timeline_endpoint(client, seeded_db):
    client.post(
        "/prescriptions",
        json={
            "doctor_id": seeded_db["doc_a"].id,
            "patient_id": seeded_db["patient"].id,
            "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 1}],
        },
    )
    resp = client.get("/events/recent")
    assert resp.status_code == 200
    events = resp.json()
    assert any(e["event_type"] == "prescription_created" for e in events)
