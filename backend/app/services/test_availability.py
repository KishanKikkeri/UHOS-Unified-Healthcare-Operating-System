"""
Test Availability Engine (Phase 5, Module 4).

Not a laboratory module -- just per-facility availability flags for a small
fixed catalog of common tests, plus one Pulse AI rule: if a commonly
required test is unavailable, recommend the nearest facility that has it
(reusing the same haversine distance logic already in redistribution.py --
no new business logic, same formula).
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import FacilityTest, PHC
from app.services.redistribution import haversine_km

COMMON_TESTS = ["CBC", "Blood Sugar", "ECG", "X-Ray", "Ultrasound"]


def ensure_catalog(db: Session, facility_id: int) -> None:
    """
    Makes sure every facility has a row for every common test (defaulting to
    available) so the card never shows a blank/missing entry.
    """
    existing = {
        row.test_name
        for row in db.query(FacilityTest).filter(FacilityTest.facility_id == facility_id).all()
    }
    missing = [t for t in COMMON_TESTS if t not in existing]
    for test_name in missing:
        db.add(FacilityTest(facility_id=facility_id, test_name=test_name, available=1))
    if missing:
        db.commit()


def set_test_availability(db: Session, facility_id: int, test_name: str, available: bool) -> FacilityTest:
    from datetime import datetime

    ensure_catalog(db, facility_id)
    row = (
        db.query(FacilityTest)
        .filter(FacilityTest.facility_id == facility_id, FacilityTest.test_name == test_name)
        .first()
    )
    if not row:
        row = FacilityTest(facility_id=facility_id, test_name=test_name, available=1 if available else 0)
        db.add(row)
    else:
        row.available = 1 if available else 0
        row.last_updated = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def _alternative_facility(db: Session, facility_id: int, test_name: str) -> Optional[dict]:
    facility = db.query(PHC).filter(PHC.id == facility_id).first()
    if not facility:
        return None

    candidates = (
        db.query(FacilityTest, PHC)
        .join(PHC, FacilityTest.facility_id == PHC.id)
        .filter(
            FacilityTest.test_name == test_name,
            FacilityTest.available == 1,
            PHC.id != facility_id,
        )
        .all()
    )

    best = None
    best_distance = None
    for _, phc in candidates:
        distance = haversine_km(facility.lat, facility.lng, phc.lat, phc.lng)
        if best_distance is None or distance < best_distance:
            best = {"facility_id": phc.id, "facility_name": phc.name, "distance_km": round(distance, 1)}
            best_distance = distance

    return best


def facility_test_summary(db: Session, facility_id: int) -> dict:
    ensure_catalog(db, facility_id)
    rows = db.query(FacilityTest).filter(FacilityTest.facility_id == facility_id).all()

    available_tests = [r.test_name for r in rows if r.available]
    unavailable_tests = [r.test_name for r in rows if not r.available]

    alerts = []
    for test_name in unavailable_tests:
        if test_name in COMMON_TESTS:
            alt = _alternative_facility(db, facility_id, test_name)
            alerts.append({
                "test_name": test_name,
                "alternative_facility": alt,
                "reasoning": (
                    f"{alt['facility_name']} ({alt['distance_km']} km away) currently offers {test_name}."
                    if alt else f"No nearby facility currently offers {test_name}."
                ),
            })

    total = len(rows)
    availability_pct = round((len(available_tests) / total) * 100, 1) if total else 100.0

    return {
        "facility_id": facility_id,
        "available_tests": available_tests,
        "unavailable_tests": unavailable_tests,
        "availability_pct": availability_pct,
        "alerts": alerts,
    }


def district_test_summary(db: Session) -> dict:
    facilities = db.query(PHC).all()
    per_facility = [facility_test_summary(db, f.id) for f in facilities]

    total_available = sum(len(f["available_tests"]) for f in per_facility)
    total_tests = sum(len(f["available_tests"]) + len(f["unavailable_tests"]) for f in per_facility)
    availability_pct = round((total_available / total_tests) * 100, 1) if total_tests else 100.0

    return {
        "availability_pct": availability_pct,
        "facilities": per_facility,
    }
