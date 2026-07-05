"""Doctor Attendance smoke tests: marking present and attendance % rollup."""


def test_mark_present(client, seeded_db):
    resp = client.post(f"/doctors/{seeded_db['doc_a'].id}/attendance", json={"status": "present"})
    assert resp.status_code == 200
    assert resp.json()["status"] == "present"


def test_attendance_percentage(client, seeded_db):
    client.post(f"/doctors/{seeded_db['doc_a'].id}/attendance", json={"status": "present"})
    client.post(f"/doctors/{seeded_db['doc_b'].id}/attendance", json={"status": "absent"})

    resp = client.get("/district/attendance")
    assert resp.status_code == 200
    body = resp.json()
    assert body["present"] == 1
    assert body["absent"] == 1
    assert body["attendance_pct"] == 50.0


def test_invalid_status_rejected(client, seeded_db):
    resp = client.post(f"/doctors/{seeded_db['doc_a'].id}/attendance", json={"status": "on_leave"})
    assert resp.status_code == 400
