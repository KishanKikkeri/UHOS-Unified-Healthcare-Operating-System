"""Test Availability smoke tests: availability endpoint + alternative-facility recommendation."""


def test_availability_endpoint(client, seeded_db):
    resp = client.get(f"/phcs/{seeded_db['phc_a'].id}/tests")
    assert resp.status_code == 200
    body = resp.json()
    assert body["availability_pct"] == 100.0
    assert len(body["available_tests"]) == 5  # full COMMON_TESTS catalog, all default-available


def test_alternative_facility_recommendation(client, seeded_db):
    # Mark CBC unavailable at phc_a; phc_b should still have it and be
    # recommended as the alternative. Touch phc_b's catalog first (as the
    # District Command Center's GET would in real usage) so its default
    # "available" rows exist to be matched against.
    client.get(f"/phcs/{seeded_db['phc_b'].id}/tests")

    resp = client.put(
        f"/phcs/{seeded_db['phc_a'].id}/tests",
        json={"test_name": "CBC", "available": False},
    )
    assert resp.status_code == 200
    alert = resp.json()["alert"]
    assert alert is not None
    assert alert["alternative_facility"]["facility_id"] == seeded_db["phc_b"].id

    summary = client.get(f"/phcs/{seeded_db['phc_a'].id}/tests").json()
    assert "CBC" in summary["unavailable_tests"]
    matching = [a for a in summary["alerts"] if a["test_name"] == "CBC"]
    assert matching and matching[0]["alternative_facility"]["facility_id"] == seeded_db["phc_b"].id
