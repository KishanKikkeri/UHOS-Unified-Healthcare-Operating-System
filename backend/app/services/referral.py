"""
Smart Referral Engine (Phase X, Module 1) -- an extension of Pulse AI.

Deterministic logic only, per the handover doc ("Use deterministic logic.
No ML."), reusing the exact same haversine distance formula already in
redistribution.py / test_availability.py. Inputs: required service, service
availability, distance, available beds, current facility load (occupancy).
Output: recommended facility + full "Why?" explanation, same reproducible
shape as the medicine redistribution engine.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import PHC, FacilityService, Referral
from app.services.redistribution import haversine_km
from app.services import facility_services as services_svc
from app.services import bed_allocation as beds_svc
from app.services import beds as legacy_beds_svc


def _facility_load_pct(db: Session, facility_id: int) -> float:
    """
    Current operational load for a facility: prefer the individually
    tracked BedUnit rows (Modules 3/4); fall back to the coarse Phase 5
    Bed aggregate if a facility has no BedUnit rows yet, so referral
    recommendations still work for facilities not yet onboarded onto the
    per-bed model.
    """
    units = beds_svc.list_facility_beds(db, facility_id)
    if units:
        total = len(units)
        occupied_or_reserved = sum(1 for u in units if u["status"] in ("occupied", "reserved"))
        return round((occupied_or_reserved / total) * 100, 1) if total else 0.0
    summary = legacy_beds_svc.facility_bed_summary(db, facility_id)
    return summary["occupancy_pct"]


def _available_beds(db: Session, facility_id: int) -> int:
    units = beds_svc.list_facility_beds(db, facility_id)
    if units:
        return sum(1 for u in units if u["status"] == "available")
    summary = legacy_beds_svc.facility_bed_summary(db, facility_id)
    return summary["available"]


def recommend_facility(db: Session, source_facility_id: int, service_name: str) -> Optional[dict]:
    """
    Pulse AI, Referral Recommendation.

    Chain (handover doc): Required Service -> Service Availability ->
    Distance -> Available Beds -> Facility Load -> Best Facility.

    Among every OTHER facility that offers `service_name`, prefer facilities
    with at least one available bed; among those, pick the nearest one; if
    two are equidistant, break ties by the lower current facility load.
    If no facility with an available bed exists, fall back to the nearest
    facility that at least offers the service (still useful to a doctor,
    just flagged as having no confirmed bed yet).
    """
    source = db.query(PHC).filter(PHC.id == source_facility_id).first()
    if not source:
        return None

    for facility in db.query(PHC).all():
        services_svc.ensure_catalog(db, facility.id)

    candidates = (
        db.query(FacilityService, PHC)
        .join(PHC, FacilityService.facility_id == PHC.id)
        .filter(
            FacilityService.service_name.ilike(service_name),
            FacilityService.available == 1,
            PHC.id != source_facility_id,
        )
        .all()
    )

    scored = []
    for _, phc in candidates:
        distance = haversine_km(source.lat, source.lng, phc.lat, phc.lng)
        available_beds = _available_beds(db, phc.id)
        load_pct = _facility_load_pct(db, phc.id)
        scored.append({
            "facility_id": phc.id,
            "facility_name": phc.name,
            "distance_km": round(distance, 1),
            "available_beds": available_beds,
            "facility_load_pct": load_pct,
        })

    if not scored:
        return None

    with_beds = [c for c in scored if c["available_beds"] > 0]
    pool = with_beds if with_beds else scored
    pool.sort(key=lambda c: (c["distance_km"], c["facility_load_pct"]))
    best = pool[0]

    if with_beds:
        reason = (
            f"Nearest facility offering {service_name} with an available bed -- "
            f"{best['facility_name']} is {best['distance_km']} km away with "
            f"{best['available_beds']} bed(s) free (current load {best['facility_load_pct']}%)."
        )
    else:
        reason = (
            f"{best['facility_name']} is the nearest facility offering {service_name} "
            f"({best['distance_km']} km away), but it currently has no available bed "
            f"(load {best['facility_load_pct']}%)."
        )

    return {
        "recommended_facility_id": best["facility_id"],
        "recommended_facility_name": best["facility_name"],
        "service_name": service_name,
        "distance_km": best["distance_km"],
        "available_beds": best["available_beds"],
        "facility_load_pct": best["facility_load_pct"],
        "reasoning": reason,
        "alternatives": [c for c in pool[1:4]],
    }


def create_referral(
    db: Session,
    patient_id: int,
    doctor_id: int,
    source_facility_id: int,
    service_name: str,
) -> dict:
    """
    Runs the recommendation, logs it as an AI decision (same reproducibility
    rule as forecast/redistribution), and persists the Referral row. Event
    emission (service_referral_created) happens in the Event Engine, not
    here, matching the on_medicine_dispensed pattern.
    """
    from app.services.event_engine import log_ai_decision

    recommendation = recommend_facility(db, source_facility_id, service_name)
    log_ai_decision(
        db, "referral_recommendation",
        {"source_facility_id": source_facility_id, "service_name": service_name},
        recommendation or {"result": "no_facility_found"},
    )

    referral = Referral(
        patient_id=patient_id,
        doctor_id=doctor_id,
        source_facility_id=source_facility_id,
        destination_facility_id=recommendation["recommended_facility_id"] if recommendation else None,
        service_name=service_name,
        distance_km=recommendation["distance_km"] if recommendation else None,
        status="pending",
        reasoning=recommendation["reasoning"] if recommendation else f"No facility currently offers {service_name}.",
    )
    db.add(referral)
    db.commit()
    db.refresh(referral)

    return {"referral": referral, "recommendation": recommendation}


def patient_referrals(db: Session, patient_id: int) -> list:
    """Citizen App -- Module 5, "My Referrals"."""
    rows = (
        db.query(Referral)
        .filter(Referral.patient_id == patient_id)
        .order_by(Referral.created_at.desc())
        .all()
    )
    out = []
    for r in rows:
        destination_name = None
        if r.destination_facility_id:
            dest = db.query(PHC).filter(PHC.id == r.destination_facility_id).first()
            destination_name = dest.name if dest else None
        bed_number = None
        if r.bed_unit_id:
            bed = beds_svc.get_bed(db, r.bed_unit_id)
            bed_number = bed.bed_number if bed else None
        out.append({
            **serialize_referral(r),
            "destination_facility_name": destination_name,
            "assigned_bed_number": bed_number,
        })
    return out


def district_referral_summary(db: Session) -> dict:
    """
    Referral Analytics card (Nice to Have): today's referrals, split by
    outcome, plus the single most-requested service overall -- deliberately
    a small card, per the handover doc ("No heavy analytics").
    """
    from datetime import datetime
    from sqlalchemy import func

    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    todays = db.query(Referral).filter(Referral.created_at >= today_start).all()

    successful = sum(1 for r in todays if r.status in ("confirmed", "completed"))
    pending = sum(1 for r in todays if r.status == "pending")
    emergency = sum(1 for r in todays if (r.service_name or "").lower() == "emergency")

    top = (
        db.query(Referral.service_name, func.count(Referral.id).label("cnt"))
        .group_by(Referral.service_name)
        .order_by(func.count(Referral.id).desc())
        .first()
    )

    return {
        "today_total": len(todays),
        "today_successful": successful,
        "today_pending": pending,
        "today_emergency": emergency,
        "top_requested_service": top[0] if top else None,
    }


def serialize_referral(referral: Referral) -> dict:
    return {
        "id": referral.id,
        "patient_id": referral.patient_id,
        "doctor_id": referral.doctor_id,
        "source_facility_id": referral.source_facility_id,
        "destination_facility_id": referral.destination_facility_id,
        "service_name": referral.service_name,
        "distance_km": referral.distance_km,
        "status": referral.status,
        "bed_unit_id": referral.bed_unit_id,
        "reasoning": referral.reasoning,
        "created_at": referral.created_at,
    }
