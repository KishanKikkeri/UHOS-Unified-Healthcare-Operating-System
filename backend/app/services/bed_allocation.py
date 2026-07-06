"""
Doctor Bed Allocation + Ward-wise Bed Status (Phase X, Modules 3 & 4).

Individually-addressable beds (`BedUnit`), separate from the coarse
total/occupied/reserved counter in `Bed` (Phase 5, Module 2) which keeps
working unchanged. `available` is always derived at read time from
`status`, never cached, so it can never drift (same principle as
services/beds.py's `available = total - occupied - reserved`).
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import BedUnit, PHC

VALID_STATUSES = {"available", "reserved", "occupied", "cleaning", "maintenance"}


def serialize_bed(bed: BedUnit) -> dict:
    return {
        "id": bed.id,
        "facility_id": bed.facility_id,
        "bed_number": bed.bed_number,
        "ward": bed.ward,
        "bed_type": bed.bed_type,
        "status": bed.status,
        "assigned_patient_id": bed.assigned_patient_id,
        "assigned_doctor_id": bed.assigned_doctor_id,
        "updated_at": bed.updated_at,
    }


def create_bed_unit(db: Session, facility_id: int, bed_number: str, ward: str, bed_type: str = "General") -> BedUnit:
    bed = BedUnit(facility_id=facility_id, bed_number=bed_number, ward=ward, bed_type=bed_type, status="available")
    db.add(bed)
    db.commit()
    db.refresh(bed)
    return bed


def list_facility_beds(db: Session, facility_id: int, ward: Optional[str] = None) -> list:
    query = db.query(BedUnit).filter(BedUnit.facility_id == facility_id)
    if ward:
        query = query.filter(BedUnit.ward == ward)
    return [serialize_bed(b) for b in query.order_by(BedUnit.ward, BedUnit.bed_number).all()]


def ward_summary(db: Session, facility_id: int) -> dict:
    """
    Groups this facility's beds by ward: available / reserved / occupied /
    total counts, matching the handover doc's Ward-wise Bed Status card
    ("General Ward 12/15", "ICU 5/8", ...).
    """
    beds = db.query(BedUnit).filter(BedUnit.facility_id == facility_id).all()
    wards: dict = {}
    for bed in beds:
        w = wards.setdefault(bed.ward, {"ward": bed.ward, "total": 0, "available": 0, "reserved": 0, "occupied": 0, "other": 0})
        w["total"] += 1
        if bed.status == "available":
            w["available"] += 1
        elif bed.status == "reserved":
            w["reserved"] += 1
        elif bed.status == "occupied":
            w["occupied"] += 1
        else:
            w["other"] += 1
    return {"facility_id": facility_id, "wards": list(wards.values())}


def district_ward_summary(db: Session) -> dict:
    facilities = db.query(PHC).all()
    return {"facilities": [ward_summary(db, f.id) for f in facilities]}


def available_bed_count(db: Session, facility_id: int) -> int:
    return db.query(BedUnit).filter(BedUnit.facility_id == facility_id, BedUnit.status == "available").count()


def get_bed(db: Session, bed_id: int) -> Optional[BedUnit]:
    return db.query(BedUnit).filter(BedUnit.id == bed_id).first()


def reserve_bed(db: Session, bed_id: int, patient_id: int, doctor_id: int) -> dict:
    bed = get_bed(db, bed_id)
    if not bed:
        return None
    bed.status = "reserved"
    bed.assigned_patient_id = patient_id
    bed.assigned_doctor_id = doctor_id
    bed.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bed)
    return serialize_bed(bed)


def release_bed(db: Session, bed_id: int) -> dict:
    bed = get_bed(db, bed_id)
    if not bed:
        return None
    bed.status = "available"
    bed.assigned_patient_id = None
    bed.assigned_doctor_id = None
    bed.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(bed)
    return serialize_bed(bed)


def transfer_bed(db: Session, from_bed_id: int, to_bed_id: int) -> Optional[dict]:
    """
    Moves the currently assigned patient/doctor from one bed to another,
    releasing the source bed. Both beds must exist; the destination must
    be `available`.
    """
    from_bed = get_bed(db, from_bed_id)
    to_bed = get_bed(db, to_bed_id)
    if not from_bed or not to_bed or to_bed.status != "available":
        return None

    to_bed.status = from_bed.status if from_bed.status in ("reserved", "occupied") else "reserved"
    to_bed.assigned_patient_id = from_bed.assigned_patient_id
    to_bed.assigned_doctor_id = from_bed.assigned_doctor_id
    to_bed.updated_at = datetime.utcnow()

    from_bed.status = "available"
    from_bed.assigned_patient_id = None
    from_bed.assigned_doctor_id = None
    from_bed.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(from_bed)
    db.refresh(to_bed)
    return {"from_bed": serialize_bed(from_bed), "to_bed": serialize_bed(to_bed)}
