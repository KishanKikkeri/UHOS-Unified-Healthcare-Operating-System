"""
Phase 5 — Healthcare Operations Extensions.

Four modules, all integrating into the existing District Command Center as
read endpoints (for cards) plus a small number of write endpoints (for
recording raw operational state -- attendance, bed counts, test flags).
No new pages, no new dashboards, no auth, no ML -- same constraints as the
rest of the backend.
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import Doctor, PHC
from app.services import attendance as attendance_svc
from app.services import beds as beds_svc
from app.services import footfall as footfall_svc
from app.services import test_availability as tests_svc
from app.services.event_engine import (
    on_attendance_recorded,
    on_bed_occupancy_updated,
    on_test_availability_changed,
)

router = APIRouter(tags=["operations"])


# --- Module 1: Doctor Attendance --------------------------------------------

class AttendanceIn(BaseModel):
    status: str = Field(description='"present" or "absent"')


@router.post("/doctors/{doctor_id}/attendance")
def mark_attendance(doctor_id: int, payload: AttendanceIn, db: Session = Depends(get_db)):
    if payload.status not in ("present", "absent"):
        raise HTTPException(status_code=400, detail='status must be "present" or "absent"')

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    row = attendance_svc.record_attendance(db, doctor_id, payload.status)
    on_attendance_recorded(db, doctor_id, doctor.phc_id, payload.status)

    return {
        "doctor_id": doctor_id,
        "date": row.date,
        "status": row.status,
        "check_in_time": row.check_in_time,
    }


@router.get("/phcs/{phc_id}/attendance")
def get_facility_attendance(phc_id: int, db: Session = Depends(get_db)):
    return attendance_svc.facility_attendance_summary(db, phc_id)


@router.get("/district/attendance")
def get_district_attendance(db: Session = Depends(get_db)):
    """Feeds the Doctor Attendance Card on the District Command Center."""
    return attendance_svc.district_attendance_summary(db)


# --- Module 2: Bed Management ------------------------------------------------

class BedUpdateIn(BaseModel):
    total: Optional[int] = Field(default=None, ge=0)
    occupied: Optional[int] = Field(default=None, ge=0)
    reserved: Optional[int] = Field(default=None, ge=0)


@router.put("/phcs/{phc_id}/beds")
def update_facility_beds(phc_id: int, payload: BedUpdateIn, db: Session = Depends(get_db)):
    facility = db.query(PHC).filter(PHC.id == phc_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    summary = beds_svc.update_beds(
        db, phc_id, total=payload.total, occupied=payload.occupied, reserved=payload.reserved
    )
    on_bed_occupancy_updated(db, phc_id, summary)
    return summary


@router.get("/phcs/{phc_id}/beds")
def get_facility_beds(phc_id: int, db: Session = Depends(get_db)):
    return beds_svc.facility_bed_summary(db, phc_id)


@router.get("/district/beds")
def get_district_beds(db: Session = Depends(get_db)):
    """Feeds the Bed Management Card on the District Command Center."""
    return beds_svc.district_bed_summary(db)


# --- Module 3: Patient Footfall ---------------------------------------------

@router.get("/phcs/{phc_id}/footfall")
def get_facility_footfall(phc_id: int, db: Session = Depends(get_db)):
    return footfall_svc.facility_footfall_summary(db, phc_id)


@router.get("/district/footfall")
def get_district_footfall(db: Session = Depends(get_db)):
    """Feeds the Patient Footfall Card on the District Command Center."""
    return footfall_svc.district_footfall_summary(db)


# --- Module 4: Test Availability --------------------------------------------

class TestAvailabilityIn(BaseModel):
    test_name: str
    available: bool


@router.put("/phcs/{phc_id}/tests")
def update_facility_test(phc_id: int, payload: TestAvailabilityIn, db: Session = Depends(get_db)):
    facility = db.query(PHC).filter(PHC.id == phc_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    row = tests_svc.set_test_availability(db, phc_id, payload.test_name, payload.available)

    alert = None
    if not payload.available:
        summary = tests_svc.facility_test_summary(db, phc_id)
        alert = next(
            (a for a in summary["alerts"] if a["test_name"] == payload.test_name), None
        )
    on_test_availability_changed(db, phc_id, payload.test_name, payload.available, alert)

    return {
        "facility_id": phc_id,
        "test_name": row.test_name,
        "available": bool(row.available),
        "last_updated": row.last_updated,
        "alert": alert,
    }


@router.get("/phcs/{phc_id}/tests")
def get_facility_tests(phc_id: int, db: Session = Depends(get_db)):
    return tests_svc.facility_test_summary(db, phc_id)


@router.get("/district/tests")
def get_district_tests(db: Session = Depends(get_db)):
    """Feeds the Test Availability Card on the District Command Center."""
    return tests_svc.district_test_summary(db)
