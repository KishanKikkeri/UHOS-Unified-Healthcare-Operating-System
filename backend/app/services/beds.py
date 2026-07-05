"""
Bed Management Engine (Phase 5, Module 2).

Intentionally simple, per the handover doc: no allocation workflow, just
totals in/out and one deterministic Pulse AI rule (occupancy > 90% -> alert).
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import Bed, PHC

OCCUPANCY_ALERT_THRESHOLD_PCT = 90.0


def get_or_create_bed_row(db: Session, facility_id: int) -> Bed:
    row = db.query(Bed).filter(Bed.facility_id == facility_id).first()
    if not row:
        row = Bed(facility_id=facility_id, total=0, occupied=0, reserved=0)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


def _summarize(row: Bed) -> dict:
    available = max(row.total - row.occupied - row.reserved, 0)
    occupancy_pct = round((row.occupied / row.total) * 100, 1) if row.total else 0.0
    return {
        "facility_id": row.facility_id,
        "total": row.total,
        "occupied": row.occupied,
        "reserved": row.reserved,
        "available": available,
        "occupancy_pct": occupancy_pct,
        "is_alert": occupancy_pct > OCCUPANCY_ALERT_THRESHOLD_PCT,
        "calculation": f"available = {row.total} - {row.occupied} - {row.reserved} = {available}",
    }


def update_beds(
    db: Session,
    facility_id: int,
    total: Optional[int] = None,
    occupied: Optional[int] = None,
    reserved: Optional[int] = None,
) -> dict:
    row = get_or_create_bed_row(db, facility_id)
    if total is not None:
        row.total = total
    if occupied is not None:
        row.occupied = occupied
    if reserved is not None:
        row.reserved = reserved
    db.commit()
    db.refresh(row)
    return _summarize(row)


def facility_bed_summary(db: Session, facility_id: int) -> dict:
    row = get_or_create_bed_row(db, facility_id)
    return _summarize(row)


def district_bed_summary(db: Session) -> dict:
    facilities = db.query(PHC).all()
    per_facility = [facility_bed_summary(db, f.id) for f in facilities]

    total = sum(f["total"] for f in per_facility)
    occupied = sum(f["occupied"] for f in per_facility)
    reserved = sum(f["reserved"] for f in per_facility)
    available = sum(f["available"] for f in per_facility)
    occupancy_pct = round((occupied / total) * 100, 1) if total else 0.0

    return {
        "total": total,
        "occupied": occupied,
        "reserved": reserved,
        "available": available,
        "occupancy_pct": occupancy_pct,
        "facilities": per_facility,
    }
