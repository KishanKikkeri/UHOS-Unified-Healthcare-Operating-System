"""
Event Engine.

Rule #1 (ARCHITECTURE_DECISIONS.md): every meaningful change in the system
creates an Event, and derived tables (FacilityScore, StockAlert) are only
ever written here -- never edited directly by API handlers (Rule #2).
"""
from sqlalchemy.orm import Session
from app.models.models import Event, FacilityScore, StockAlert, Medicine, AIDecisionLog
from app.services.forecast import avg_daily_consumption, forecast_days_remaining, SAFETY_THRESHOLD_DAYS
from app.services.facility_score import compute_facility_score
from app.services.redistribution import find_redistribution_source


def log_ai_decision(db: Session, engine: str, input_json: dict, output_json: dict) -> AIDecisionLog:
    """
    Reproducibility log (Sprint 1.5): every Pulse AI recommendation is
    stored with its exact inputs and outputs so it can be audited later,
    e.g. "show me exactly why the AI recommended this transfer at 11:41am."
    """
    log = AIDecisionLog(engine=engine, input_json=input_json, output_json=output_json)
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


def record_event(db: Session, event_type: str, payload: dict) -> Event:
    event = Event(event_type=event_type, payload=payload)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def recompute_facility_score(db: Session, phc_id: int) -> FacilityScore:
    result = compute_facility_score(db, phc_id)
    score_row = FacilityScore(
        phc_id=phc_id,
        score=result["score"],
        medicine_score=result["medicine_score"],
        doctor_score=result["doctor_score"],
    )
    db.add(score_row)
    db.commit()
    db.refresh(score_row)
    return score_row


def recompute_stock_alert(db: Session, phc_id: int, medicine_id: int) -> StockAlert:
    """
    Recomputes the alert for a single phc/medicine pair after a dispensing
    event. If stock is now critical, attaches a redistribution suggestion.
    Logs the full decision for auditability.
    """
    rate = avg_daily_consumption(db, phc_id, medicine_id)
    breakdown = forecast_days_remaining(db, phc_id, medicine_id, rate)
    log_ai_decision(db, "forecast", {"phc_id": phc_id, "medicine_id": medicine_id}, breakdown)

    recommended_qty = None
    recommended_source = None
    reasoning = breakdown["calculation"]

    if breakdown["is_critical"]:
        shortfall = max(rate * SAFETY_THRESHOLD_DAYS - breakdown["current_stock"], 0)
        source = find_redistribution_source(db, phc_id, medicine_id, shortfall)
        log_ai_decision(
            db, "redistribution",
            {"phc_id": phc_id, "medicine_id": medicine_id, "shortfall": shortfall},
            source or {"result": "no_surplus_facility_found"},
        )
        if source:
            recommended_qty = source["transfer_qty"]
            recommended_source = source["source_phc_id"]
            reasoning += " | " + source["reason"]
        else:
            reasoning += " | No nearby facility currently has sufficient surplus -- district-level shortage."

    alert = StockAlert(
        phc_id=phc_id,
        medicine_id=medicine_id,
        days_remaining=breakdown["days_remaining"],
        recommended_transfer_qty=recommended_qty,
        recommended_source_phc_id=recommended_source,
        reasoning=reasoning,
        status="open" if breakdown["is_critical"] else "resolved",
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    if breakdown["is_critical"]:
        record_event(db, "stock_alert_generated", {"phc_id": phc_id, "medicine_id": medicine_id, "alert_id": alert.id})
    return alert


def on_medicine_dispensed(db: Session, phc_id: int, medicine_id: int, payload: dict):
    """
    The chain from the design doc, made real:
    Medicine Dispensed -> Inventory Updated -> Alerts Recomputed ->
    Facility Score Recomputed.
    (Inventory update happens in the API route right before this is called,
    since it's part of the same DB transaction as the dispense.)
    """
    record_event(db, "medicine_dispensed", payload)
    recompute_stock_alert(db, phc_id, medicine_id)
    recompute_facility_score(db, phc_id)


# ---------------------------------------------------------------------------
# Phase 5 — Healthcare Operations Extensions
#
# Same pattern as on_medicine_dispensed above: the route writes the raw
# state (attendance / bed counts / test flag) first, then hands off to the
# Event Engine to log the event and, where the handover doc's chain diagram
# calls for it, recompute the one derived table that depends on it
# (FacilityScore, via the exact same recompute_facility_score already used
# by the medicine-dispensing chain -- no new scoring logic).
# ---------------------------------------------------------------------------


def on_attendance_recorded(db: Session, doctor_id: int, phc_id: int, status: str):
    """
    Attendance Recorded -> Attendance Event -> Facility Score Recomputed ->
    Dashboard Updated (Phase 5, Module 1 chain diagram).
    """
    event_type = "doctor_checked_in" if status == "present" else "doctor_marked_absent"
    record_event(db, event_type, {"doctor_id": doctor_id, "phc_id": phc_id, "status": status})
    recompute_facility_score(db, phc_id)


def on_bed_occupancy_updated(db: Session, phc_id: int, summary: dict):
    """
    Bed Occupancy Updated -> Event -> Dashboard update, plus the Pulse AI
    rule from the handover doc: occupancy > 90% -> alert event.
    """
    record_event(db, "bed_occupancy_updated", {"phc_id": phc_id, **summary})
    if summary.get("is_alert"):
        record_event(db, "bed_occupancy_critical", {"phc_id": phc_id, "occupancy_pct": summary["occupancy_pct"]})


def on_test_availability_changed(db: Session, phc_id: int, test_name: str, available: bool, alert: dict = None):
    """
    Test availability toggled -> Event; if it just became unavailable and
    Pulse AI found an alternative facility, that's logged as an
    AIDecisionLog too (same reproducibility rule as forecast/redistribution).
    """
    record_event(
        db, "test_availability_changed",
        {"phc_id": phc_id, "test_name": test_name, "available": available},
    )
    if not available and alert:
        log_ai_decision(
            db, "test_availability",
            {"phc_id": phc_id, "test_name": test_name},
            alert,
        )


# ---------------------------------------------------------------------------
# Phase X — Smart Referral & Advanced Bed Management
#
# Same pattern as Phase 5 above: the route/service writes the raw referral
# or bed-unit row first, then hands off here to log the Event Engine entry.
# No new derived tables are touched by these -- Referral and BedUnit rows
# are themselves raw state (same class as Bed / FacilityTest), so nothing
# here recomputes FacilityScore or any other derived table.
# ---------------------------------------------------------------------------


def on_referral_created(db: Session, referral, recommendation: dict = None):
    """
    Doctor creates referral -> Pulse AI searches facilities -> Referral
    generated -> Citizen App / District Dashboard / Timeline updated
    (Phase X design principle chain, made real).
    """
    record_event(db, "service_referral_created", {
        "referral_id": referral.id,
        "patient_id": referral.patient_id,
        "doctor_id": referral.doctor_id,
        "source_facility_id": referral.source_facility_id,
        "destination_facility_id": referral.destination_facility_id,
        "service_name": referral.service_name,
        "status": referral.status,
    })


def on_bed_reserved(db: Session, bed: dict, referral_id: int = None):
    record_event(db, "bed_reserved", {
        "bed_id": bed["id"],
        "facility_id": bed["facility_id"],
        "ward": bed["ward"],
        "bed_number": bed["bed_number"],
        "assigned_patient_id": bed["assigned_patient_id"],
        "assigned_doctor_id": bed["assigned_doctor_id"],
        "referral_id": referral_id,
    })


def on_bed_released(db: Session, bed: dict):
    record_event(db, "bed_released", {
        "bed_id": bed["id"],
        "facility_id": bed["facility_id"],
        "ward": bed["ward"],
        "bed_number": bed["bed_number"],
    })


def on_bed_transferred(db: Session, from_bed: dict, to_bed: dict):
    record_event(db, "bed_transferred", {
        "from_bed_id": from_bed["id"],
        "to_bed_id": to_bed["id"],
        "facility_id": to_bed["facility_id"],
        "assigned_patient_id": to_bed["assigned_patient_id"],
        "assigned_doctor_id": to_bed["assigned_doctor_id"],
    })
