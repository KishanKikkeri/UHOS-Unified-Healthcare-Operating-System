"""Doctor Bed Allocation + Ward-wise Bed Status smoke tests (Phase X, Modules 3 & 4)."""


def _create_bed(client, facility_id, bed_number="G-1", ward="General Ward"):
    resp = client.post(
        f"/facilities/{facility_id}/beds/units",
        json={"bed_number": bed_number, "ward": ward, "bed_type": "General"},
    )
    assert resp.status_code == 200
    return resp.json()


def test_create_and_list_bed_units(client, seeded_db):
    facility_id = seeded_db["phc_a"].id
    bed = _create_bed(client, facility_id)
    assert bed["status"] == "available"

    resp = client.get(f"/facilities/{facility_id}/beds/units")
    assert resp.status_code == 200
    assert any(b["id"] == bed["id"] for b in resp.json())


def test_reserve_release_bed(client, seeded_db):
    facility_id = seeded_db["phc_a"].id
    bed = _create_bed(client, facility_id, bed_number="G-2")

    reserve_resp = client.put(
        f"/beds/{bed['id']}/reserve",
        json={"patient_id": seeded_db["patient"].id, "doctor_id": seeded_db["doc_a"].id},
    )
    assert reserve_resp.status_code == 200
    body = reserve_resp.json()
    assert body["status"] == "reserved"
    assert body["assigned_patient_id"] == seeded_db["patient"].id

    # Reserving an already-reserved bed should fail.
    conflict_resp = client.put(
        f"/beds/{bed['id']}/reserve",
        json={"patient_id": seeded_db["patient"].id, "doctor_id": seeded_db["doc_a"].id},
    )
    assert conflict_resp.status_code == 400

    release_resp = client.put(f"/beds/{bed['id']}/release")
    assert release_resp.status_code == 200
    assert release_resp.json()["status"] == "available"
    assert release_resp.json()["assigned_patient_id"] is None


def test_transfer_bed(client, seeded_db):
    facility_id = seeded_db["phc_a"].id
    bed_1 = _create_bed(client, facility_id, bed_number="T-1")
    bed_2 = _create_bed(client, facility_id, bed_number="T-2")

    client.put(
        f"/beds/{bed_1['id']}/reserve",
        json={"patient_id": seeded_db["patient"].id, "doctor_id": seeded_db["doc_a"].id},
    )

    transfer_resp = client.put(f"/beds/{bed_1['id']}/transfer", json={"to_bed_id": bed_2["id"]})
    assert transfer_resp.status_code == 200
    body = transfer_resp.json()
    assert body["from_bed"]["status"] == "available"
    assert body["to_bed"]["assigned_patient_id"] == seeded_db["patient"].id


def test_ward_summary(client, seeded_db):
    facility_id = seeded_db["phc_a"].id
    _create_bed(client, facility_id, bed_number="W-1", ward="ICU")
    _create_bed(client, facility_id, bed_number="W-2", ward="ICU")

    resp = client.get(f"/facilities/{facility_id}/wards")
    assert resp.status_code == 200
    wards = {w["ward"]: w for w in resp.json()["wards"]}
    assert "ICU" in wards
    assert wards["ICU"]["total"] == 2
    assert wards["ICU"]["available"] == 2


def test_district_wards(client, seeded_db):
    _create_bed(client, seeded_db["phc_a"].id, bed_number="D-1")
    resp = client.get("/district/wards")
    assert resp.status_code == 200
    assert "facilities" in resp.json()
