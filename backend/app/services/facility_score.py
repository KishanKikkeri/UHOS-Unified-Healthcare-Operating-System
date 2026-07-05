"""
Facility Score Engine (part of Pulse AI).

Deterministic weighted formula, same spirit as ADR-001: every number a
judge could recompute by hand from the raw data.
"""
from sqlalchemy.orm import Session
from app.models.models import PHC, Doctor, Inventory
from app.services.forecast import avg_daily_consumption, SAFETY_THRESHOLD_DAYS

MEDICINE_WEIGHT = 0.6
DOCTOR_WEIGHT = 0.4


def compute_medicine_score(db: Session, phc_id: int) -> float:
    """
    % of stocked medicines currently above the safety threshold.
    """
    inventory_rows = db.query(Inventory).filter(Inventory.phc_id == phc_id).all()
    if not inventory_rows:
        return 100.0  # nothing tracked yet -> no known deficiency

    healthy = 0
    for row in inventory_rows:
        rate = avg_daily_consumption(db, phc_id, row.medicine_id)
        days_remaining = row.stock_qty / rate if rate > 0 else float("inf")
        if days_remaining >= SAFETY_THRESHOLD_DAYS:
            healthy += 1

    return round((healthy / len(inventory_rows)) * 100, 1)


def compute_doctor_score(db: Session, phc_id: int) -> float:
    """
    % of assigned doctors currently marked active (not absent).
    """
    doctors = db.query(Doctor).filter(Doctor.phc_id == phc_id).all()
    if not doctors:
        return 100.0

    active = sum(1 for d in doctors if d.status == "active")
    return round((active / len(doctors)) * 100, 1)


def compute_facility_score(db: Session, phc_id: int) -> dict:
    medicine_score = compute_medicine_score(db, phc_id)
    doctor_score = compute_doctor_score(db, phc_id)
    overall = round(medicine_score * MEDICINE_WEIGHT + doctor_score * DOCTOR_WEIGHT, 1)

    return {
        "phc_id": phc_id,
        "medicine_score": medicine_score,
        "doctor_score": doctor_score,
        "score": overall,
        "calculation": (
            f"({medicine_score} x {MEDICINE_WEIGHT}) + ({doctor_score} x {DOCTOR_WEIGHT}) "
            f"= {overall}"
        ),
    }
