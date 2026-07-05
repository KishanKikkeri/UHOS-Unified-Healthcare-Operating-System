from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import StockAlert, FacilityScore, PHC, Doctor, Appointment, Event, Medicine
from app.schemas.schemas import StockAlertOut, FacilityScoreOut, AppointmentCreate
from app.services.facility_score import compute_facility_score
from app.services.forecast import avg_daily_consumption, forecast_days_remaining
from app.services.redistribution import find_redistribution_source

router = APIRouter(tags=["dashboard"])


@router.get("/phcs/{phc_id}/alerts", response_model=List[StockAlertOut])
def get_alerts(phc_id: int, db: Session = Depends(get_db)):
    """
    District Command Center feed: most recent open alert per medicine.
    """
    alerts = (
        db.query(StockAlert)
        .filter(StockAlert.phc_id == phc_id, StockAlert.status == "open")
        .order_by(StockAlert.created_at.desc())
        .all()
    )
    return alerts


@router.get("/phcs/{phc_id}/score", response_model=FacilityScoreOut)
def get_score(phc_id: int, db: Session = Depends(get_db)):
    latest = (
        db.query(FacilityScore)
        .filter(FacilityScore.phc_id == phc_id)
        .order_by(FacilityScore.computed_at.desc())
        .first()
    )
    if not latest:
        raise HTTPException(status_code=404, detail="No score computed yet for this facility")
    return latest


@router.get("/district/alerts", response_model=List[StockAlertOut])
def get_district_alerts(db: Session = Depends(get_db)):
    """
    All open alerts across every PHC/CHC -- this is what feeds the
    District AI Command Center's "Where should I intervene right now?" view.
    """
    return (
        db.query(StockAlert)
        .filter(StockAlert.status == "open")
        .order_by(StockAlert.days_remaining.asc())
        .all()
    )


@router.get("/medicines")
def get_medicines(db: Session = Depends(get_db)):
    """
    Sprint 2 addition (frontend-required, read-only): StockAlertOut only
    carries medicine_id, and no endpoint exposed the medicine catalog
    anywhere -- the Critical Alerts cards need the name ("Paracetamol"),
    not the raw id, to match the handover doc's mockups.
    """
    return [
        {"id": m.id, "name": m.name, "unit": m.unit}
        for m in db.query(Medicine).all()
    ]


@router.get("/district/facilities")
def get_district_facilities(db: Session = Depends(get_db)):
    """
    Sprint 2 addition (frontend-required, read-only): every facility with its
    latest computed score in one call, so the District Command Center's
    Facility Scores widget isn't forced into an N+1 loop over
    /phcs/{id}/score. Does not write anything -- if a facility has no
    persisted FacilityScore row yet (no dispensing events recorded against
    it), the score is computed live from current data via the same
    deterministic formula in facility_score.py, matching ADR-003's rule that
    derived tables are only ever written by the Event Engine.
    """
    facilities = db.query(PHC).all()
    latest_scores = {
        row.phc_id: row
        for row in (
            db.query(FacilityScore)
            .order_by(FacilityScore.phc_id, FacilityScore.computed_at.desc())
            .all()
        )
    }

    results = []
    for phc in facilities:
        latest = latest_scores.get(phc.id)
        if latest:
            score, medicine_score, doctor_score = latest.score, latest.medicine_score, latest.doctor_score
        else:
            live = compute_facility_score(db, phc.id)
            score, medicine_score, doctor_score = live["score"], live["medicine_score"], live["doctor_score"]

        results.append({
            "phc_id": phc.id,
            "name": phc.name,
            "district": phc.district,
            "type": phc.type,
            "lat": phc.lat,
            "lng": phc.lng,
            "score": score,
            "medicine_score": medicine_score,
            "doctor_score": doctor_score,
        })
    return results


@router.get("/district/alerts/{alert_id}/explanation")
def get_alert_explanation(alert_id: int, db: Session = Depends(get_db)):
    """
    Sprint 2 addition (frontend-required, read-only): the structured
    breakdown the "Why?" drawer needs (current stock, consumption rate,
    days remaining, safety threshold, selected source facility, distance).
    StockAlertOut only carries a flattened `reasoning` string; this
    recomputes the same numbers live via forecast.py / redistribution.py
    (no writes, no new business logic -- identical formulas already used by
    the Event Engine) so the UI never has to calculate anything itself.
    """
    alert = db.query(StockAlert).filter(StockAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    rate = avg_daily_consumption(db, alert.phc_id, alert.medicine_id)
    breakdown = forecast_days_remaining(db, alert.phc_id, alert.medicine_id, rate)

    source_name: Optional[str] = None
    distance_km: Optional[float] = None
    if alert.recommended_source_phc_id:
        source_phc = db.query(PHC).filter(PHC.id == alert.recommended_source_phc_id).first()
        if source_phc:
            source_name = source_phc.name
        if alert.recommended_transfer_qty:
            source = find_redistribution_source(
                db, alert.phc_id, alert.medicine_id, alert.recommended_transfer_qty
            )
            if source:
                distance_km = source["distance_km"]

    return {
        "alert_id": alert.id,
        "current_stock": breakdown["current_stock"],
        "avg_daily_consumption": breakdown["avg_daily_consumption"],
        "days_remaining": breakdown["days_remaining"],
        "safety_threshold_days": breakdown["safety_threshold_days"],
        "recommended_transfer_qty": alert.recommended_transfer_qty,
        "recommended_source_phc_id": alert.recommended_source_phc_id,
        "recommended_source_phc_name": source_name,
        "distance_km": distance_km,
        "reasoning": alert.reasoning,
    }


@router.get("/events/recent")
def get_recent_events(limit: int = 20, db: Session = Depends(get_db)):
    """
    Sprint 2 addition (frontend-required, read-only): feeds the Live Event
    Timeline. The `events` table (ADR: append-only Event Engine log) already
    existed with nothing reading it -- this just exposes it, newest first.
    """
    events = (
        db.query(Event)
        .order_by(Event.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": e.id,
            "event_type": e.event_type,
            "payload": e.payload,
            "created_at": e.created_at,
        }
        for e in events
    ]


@router.get("/doctors")
def list_doctors(phc_id: Optional[int] = None, db: Session = Depends(get_db)):
    """
    Sprint 3 addition (frontend-required, read-only): the Doctor Workspace
    needs a doctor picker (there's no auth system in this build, so the
    "logged in as" doctor is chosen from a list). Reads the same Doctor
    rows `/doctors/availability` already reads, just without the
    specialization filter -- no new tables, no writes.
    """
    query = db.query(Doctor)
    if phc_id is not None:
        query = query.filter(Doctor.phc_id == phc_id)
    doctors = query.order_by(Doctor.name.asc()).all()
    return [
        {
            "id": d.id,
            "name": d.name,
            "specialization": d.specialization,
            "phc_id": d.phc_id,
            "phc_name": d.phc.name,
            "status": d.status,
        }
        for d in doctors
    ]


@router.get("/doctors/availability")
def doctor_availability(specialization: str, db: Session = Depends(get_db)):
    """
    Citizen Health App: which active doctors of a given specialization are
    available, and at which facility.
    """
    doctors = (
        db.query(Doctor)
        .filter(Doctor.specialization == specialization, Doctor.status == "active")
        .all()
    )
    return [
        {
            "doctor_id": d.id,
            "name": d.name,
            "phc_id": d.phc_id,
            "phc_name": d.phc.name,
        }
        for d in doctors
    ]


@router.post("/appointments")
def book_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    appt = Appointment(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        phc_id=payload.phc_id,
        scheduled_at=payload.scheduled_at,
    )
    db.add(appt)
    db.commit()
    db.refresh(appt)
    return {"appointment_id": appt.id, "status": appt.status}
