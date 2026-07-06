"""Facility Services Directory smoke tests (Phase X, Module 2)."""


def test_facility_services_default_catalog(client, seeded_db):
    resp = client.get(f"/facilities/{seeded_db['phc_a'].id}/services")
    assert resp.status_code == 200
    body = resp.json()
    assert body["facility_id"] == seeded_db["phc_a"].id
    assert len(body["services"]) > 0


def test_upsert_and_search_service(client, seeded_db):
    resp = client.put(
        f"/facilities/{seeded_db['phc_b'].id}/services",
        json={"service_name": "MRI", "category": "Diagnostic", "available": True},
    )
    assert resp.status_code == 200
    assert resp.json()["service_name"] == "MRI"

    search_resp = client.get("/services/search", params={"name": "MRI"})
    assert search_resp.status_code == 200
    names = [r["facility_id"] for r in search_resp.json()]
    assert seeded_db["phc_b"].id in names


def test_services_catalog_endpoint(client, seeded_db):
    # Ensure catalogs exist for at least one facility first.
    client.get(f"/facilities/{seeded_db['phc_a'].id}/services")
    resp = client.get("/services")
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_unknown_facility_returns_404(client, seeded_db):
    resp = client.get("/facilities/999999/services")
    assert resp.status_code == 404
