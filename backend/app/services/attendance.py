"""
Doctor Attendance Engine (Phase 5, Module 1).

Deterministic, explainable, same spirit as forecast.py / facility_score.py --
attendance % is a plain ratio, nothing trained or inferred.
"""
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import Doctor, DoctorAttendance, PHC

ABSENCE_ALERT_THRESHOLD_PCT = 70.0  # below this, Pulse AI flags the facility


def today_str() -> str:
    return datetime.utcnow().strftime("%Y-%m-%d")


def record_attendance(
    db: Session, doctor_id: int, status: str, date: Optional[str] = None
) -> DoctorAttendance:
    """
    Upserts today's attendance row for a doctor (one row per doctor per day)
    and mirrors it onto Doctor.status, since Doctor.status is what
    facility_score.py's compute_doctor_score already reads (ADR-locked
    formula -- Phase 5 must not duplicate or replace that logic, only feed
    it real data).
    """
    day = date or today_str()
    row = (
        db.query(DoctorAttendance)
        .filter(DoctorAttendance.doctor_id == doctor_id, DoctorAttendance.date == day)
        .first()
    )
    check_in_time = datetime.utcnow() if status == "present" else None

    if row:
        row.status = status
        row.check_in_time = check_in_time
    else:
        row = DoctorAttendance(
            doctor_id=doctor_id, date=day, status=status, check_in_time=check_in_time
        )
        db.add(row)
    db.commit()
    db.refresh(row)

    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if doctor:
        doctor.status = "active" if status == "present" else "absent"
        db.commit()

    return row


def facility_attendance_summary(db: Session, facility_id: int, date: Optional[str] = None) -> dict:
    """
    Today's attendance snapshot for one facility -- backs the Doctor
    Attendance Card's per-facility rollup and the expandable drawer.
    """
    day = date or today_str()
    doctors = db.query(Doctor).filter(Doctor.phc_id == facility_id).all()

    rows_by_doctor = {
        row.doctor_id: row
        for row in (
            db.query(DoctorAttendance)
            .filter(DoctorAttendance.date == day)
            .all()
        )
    }

    details = []
    present = 0
    for doc in doctors:
        att = rows_by_doctor.get(doc.id)
        status = att.status if att else ("present" if doc.status == "active" else "absent")
        if status == "present":
            present += 1
        details.append({
            "doctor_id": doc.id,
            "doctor_name": doc.name,
            "facility_id": facility_id,
            "status": status,
            "check_in_time": att.check_in_time if att else None,
        })

    total = len(doctors)
    absent = total - present
    attendance_pct = round((present / total) * 100, 1) if total else 100.0

    return {
        "facility_id": facility_id,
        "date": day,
        "present": present,
        "absent": absent,
        "total": total,
        "attendance_pct": attendance_pct,
        "is_alert": attendance_pct < ABSENCE_ALERT_THRESHOLD_PCT,
        "doctors": details,
    }


def district_attendance_summary(db: Session, date: Optional[str] = None) -> dict:
    """
    District-wide roll-up across every facility -- feeds the Doctor
    Attendance Card's top-line numbers (Present / Absent / Attendance %).
    """
    day = date or today_str()
    facilities = db.query(PHC).all()
    per_facility = [facility_attendance_summary(db, f.id, day) for f in facilities]

    total = sum(f["total"] for f in per_facility)
    present = sum(f["present"] for f in per_facility)
    absent = total - present
    attendance_pct = round((present / total) * 100, 1) if total else 100.0

    return {
        "date": day,
        "present": present,
        "absent": absent,
        "total": total,
        "attendance_pct": attendance_pct,
        "facilities": per_facility,
    }
