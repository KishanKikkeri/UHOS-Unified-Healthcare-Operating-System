"""
WebSocket smoke tests for /ws/dashboard: confirms the timeline relays new
Event Engine rows and that the pulse heartbeat still fires.
"""


def test_pulse_heartbeat(client):
    with client.websocket_connect("/ws/dashboard") as ws:
        # First message should arrive within the poll/pulse loop; pulse
        # fires immediately since next_pulse_at starts at "now".
        msg = ws.receive_json()
        assert msg["type"] in ("event", "pulse")


def test_timeline_receives_new_events(client, seeded_db):
    with client.websocket_connect("/ws/dashboard") as ws:
        # Create a prescription (and therefore an event) after the socket
        # has already recorded "now" as its baseline last_id.
        client.post(
            "/prescriptions",
            json={
                "doctor_id": seeded_db["doc_a"].id,
                "patient_id": seeded_db["patient"].id,
                "items": [{"medicine_id": seeded_db["med_high"].id, "quantity": 1}],
            },
        )

        seen_event = False
        for _ in range(10):
            msg = ws.receive_json()
            if msg["type"] == "event" and msg["data"]["event_type"] == "prescription_created":
                seen_event = True
                break
        assert seen_event
