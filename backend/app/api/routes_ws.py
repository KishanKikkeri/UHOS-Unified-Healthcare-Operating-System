"""
Sprint 2 addition: real-time transport for two UI elements only (Live Event
Timeline, Pulse AI status indicator), per the review note --

    "Instead of refreshing alerts every few seconds, let's use WebSockets
    for just two UI elements ... Every other card (alerts, facility scores)
    can continue using normal polling. This gives us a real-time feel
    without requiring a full real-time architecture."

Design choice: rather than wiring a pub/sub broadcast into the Event
Engine's write path (which runs on sync DB sessions inside request
threads, and would need cross-thread coordination with this async
endpoint's event loop), each connected client gets its own lightweight
server-side poll loop that opens a fresh short-lived session every second
and reads the `events` table for anything newer than the last id it sent.
This is a read-only consumer of a table that's already the Event Engine's
append-only log (ARCHITECTURE_DECISIONS.md #001) -- no business logic,
no new writes, nothing added to the request path of `POST /prescriptions`.
A separate ~2s timer pushes a "pulse" message so the frontend's Pulse AI
indicator reflects the live socket connection instead of a REST poll
result.
"""
import asyncio
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.db.database import SessionLocal
from app.models.models import Event

router = APIRouter(tags=["realtime"])

EVENT_POLL_INTERVAL_SEC = 1.0
PULSE_INTERVAL_SEC = 2.0


def _latest_event_id() -> int:
    db = SessionLocal()
    try:
        latest = db.query(Event.id).order_by(Event.id.desc()).limit(1).scalar()
        return latest or 0
    finally:
        db.close()


def _events_after(last_id: int):
    db = SessionLocal()
    try:
        return (
            db.query(Event)
            .filter(Event.id > last_id)
            .order_by(Event.id.asc())
            .all()
        )
    finally:
        db.close()


@router.websocket("/ws/dashboard")
async def dashboard_socket(websocket: WebSocket):
    await websocket.accept()

    # Start from "now" so a freshly opened dashboard doesn't replay history
    # into the timeline -- REST (`GET /events/recent`) already seeded that.
    last_id = _latest_event_id()
    loop = asyncio.get_event_loop()
    next_pulse_at = loop.time()

    try:
        while True:
            new_events = _events_after(last_id)
            for e in new_events:
                last_id = e.id
                await websocket.send_json({
                    "type": "event",
                    "data": {
                        "id": e.id,
                        "event_type": e.event_type,
                        "payload": e.payload,
                        "created_at": e.created_at.isoformat(),
                    },
                })

            now = loop.time()
            if now >= next_pulse_at:
                next_pulse_at = now + PULSE_INTERVAL_SEC
                await websocket.send_json({
                    "type": "pulse",
                    "ts": datetime.utcnow().isoformat(),
                })

            await asyncio.sleep(EVENT_POLL_INTERVAL_SEC)
    except WebSocketDisconnect:
        pass
