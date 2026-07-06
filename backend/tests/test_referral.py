"""Smart Referral Engine + Citizen Referral Tracking smoke tests (Phase X, Modules 1 & 5)."""


def _setup_referral_scenario(client, seeded_db):
    """phc_a lacks MRI; phc_b offers it and has one available bed."""
    client.put(f"/facilities/{seeded_db['phc_b'].id}/services", json={"service_name": "MRI", "category": "Diagnostic", "available": True})
    bed_resp = client.post(f"/facilities/{seeded_db['phc_b'].id}/beds/units", json={"bed_number": "M-1", "ward": "General Ward"})
    return bed_resp.json()


def test_recommend_referral_finds_facility_with_service_and_bed(client, seeded_db):
    _setup_referral_scenario(client, seeded_db)

    resp = client.post(
        "/referrals/recommend",
        json={"source_facility_id": seeded_db["phc_a"].id, "service_name": "MRI"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["recommended_facility_id"] == seeded_db["phc_b"].id
    assert body["available_beds"] >= 1
    assert "reasoning" in body


def test_recommend_referral_no_facility_found(client, seeded_db):
    resp = client.post(
        "/referrals/recommend",
        json={"source_facility_id": seeded_db["phc_a"].id, "service_name": "Nonexistent Service XYZ"},
    )
    assert resp.status_code == 200
    assert resp.json()["recommended_facility_id"] is None


def test_create_referral_and_track_as_citizen(client, seeded_db):
    _setup_referral_scenario(client, seeded_db)

    create_resp = client.post(
        "/referrals",
        json={
            "patient_id": seeded_db["patient"].id,
            "doctor_id": seeded_db["doc_a"].id,
            "source_facility_id": seeded_db["phc_a"].id,
            "service_name": "MRI",
        },
    )
    assert create_resp.status_code == 200
    referral = create_resp.json()["referral"]
    assert referral["destination_facility_id"] == seeded_db["phc_b"].id
    assert referral["status"] == "pending"

    tracking_resp = client.get(f"/patients/{seeded_db['patient'].id}/referrals")
    assert tracking_resp.status_code == 200
    referrals = tracking_resp.json()
    assert len(referrals) == 1
    assert referrals[0]["destination_facility_name"] == seeded_db["phc_b"].name


def test_reserving_bed_against_referral_confirms_it(client, seeded_db):
    bed = _setup_referral_scenario(client, seeded_db)

    create_resp = client.post(
        "/referrals",
        json={
            "patient_id": seeded_db["patient"].id,
            "doctor_id": seeded_db["doc_a"].id,
            "source_facility_id": seeded_db["phc_a"].id,
            "service_name": "MRI",
        },
    )
    referral_id = create_resp.json()["referral"]["id"]

    reserve_resp = client.put(
        f"/beds/{bed['id']}/reserve",
        json={
            "patient_id": seeded_db["patient"].id,
            "doctor_id": seeded_db["doc_a"].id,
            "referral_id": referral_id,
        },
    )
    assert reserve_resp.status_code == 200

    referral_resp = client.get(f"/referrals/{referral_id}")
    assert referral_resp.json()["status"] == "confirmed"
    assert referral_resp.json()["bed_unit_id"] == bed["id"]

    tracking_resp = client.get(f"/patients/{seeded_db['patient'].id}/referrals")
    assert tracking_resp.json()[0]["assigned_bed_number"] == bed["bed_number"]


def test_district_referral_analytics(client, seeded_db):
    _setup_referral_scenario(client, seeded_db)
    client.post(
        "/referrals",
        json={
            "patient_id": seeded_db["patient"].id,
            "doctor_id": seeded_db["doc_a"].id,
            "source_facility_id": seeded_db["phc_a"].id,
            "service_name": "MRI",
        },
    )
    resp = client.get("/district/referrals")
    assert resp.status_code == 200
    body = resp.json()
    assert body["today_total"] >= 1
    assert body["top_requested_service"] == "MRI"
