"""Bed Management smoke tests: occupancy calculation and >90% alert rule."""


def test_occupancy_calculation(client, seeded_db):
    resp = client.put(
        f"/phcs/{seeded_db['phc_a'].id}/beds",
        json={"total": 20, "occupied": 10, "reserved": 2},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["available"] == 8
    assert body["occupancy_pct"] == 50.0
    assert body["is_alert"] is False


def test_occupancy_over_90_triggers_alert(client, seeded_db):
    resp = client.put(
        f"/phcs/{seeded_db['phc_a'].id}/beds",
        json={"total": 20, "occupied": 19, "reserved": 0},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["occupancy_pct"] == 95.0
    assert body["is_alert"] is True
    # Event emission on the >90% threshold is covered in test_events.py.
