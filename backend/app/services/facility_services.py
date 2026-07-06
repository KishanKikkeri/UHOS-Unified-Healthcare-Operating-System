"""
Facility Services Directory (Phase X, Module 2).

Plain lookup/search over a per-facility service catalog -- no scoring, no
AI, just the raw directory that the Smart Referral Engine (referral.py)
reads from. Same additive philosophy as test_availability.py: a facility
with no rows yet simply has an empty directory rather than an error.
"""
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import FacilityService, PHC

# Default catalog seeded per facility type when a facility has no services
# recorded yet, mirroring the handover doc's PHC / CHC / District Hospital
# examples. Purely a convenience default -- any facility's directory can
# still be edited afterwards via upsert_service.
DEFAULT_CATALOG = {
    "PHC": [
        ("General OPD", "Consultation"),
        ("Vaccination", "Preventive"),
        ("Blood Sugar", "Diagnostic"),
        ("BP", "Diagnostic"),
        ("ECG", "Diagnostic"),
    ],
    "CHC": [
        ("Emergency", "Critical Care"),
        ("Ultrasound", "Diagnostic"),
        ("X-Ray", "Diagnostic"),
        ("Lab", "Diagnostic"),
        ("Minor Surgery", "Surgical"),
    ],
    "District Hospital": [
        ("MRI", "Diagnostic"),
        ("CT Scan", "Diagnostic"),
        ("ICU", "Critical Care"),
        ("Blood Bank", "Critical Care"),
        ("Cardiology", "Specialist"),
        ("Neurology", "Specialist"),
    ],
}


def ensure_catalog(db: Session, facility_id: int) -> None:
    facility = db.query(PHC).filter(PHC.id == facility_id).first()
    if not facility:
        return
    existing = {
        row.service_name
        for row in db.query(FacilityService).filter(FacilityService.facility_id == facility_id).all()
    }
    defaults = DEFAULT_CATALOG.get(facility.type, [])
    for service_name, category in defaults:
        if service_name not in existing:
            db.add(FacilityService(facility_id=facility_id, service_name=service_name, category=category, available=1))
    if defaults:
        db.commit()


def upsert_service(db: Session, facility_id: int, service_name: str, category: Optional[str], available: bool) -> FacilityService:
    from datetime import datetime

    row = (
        db.query(FacilityService)
        .filter(FacilityService.facility_id == facility_id, FacilityService.service_name == service_name)
        .first()
    )
    if not row:
        row = FacilityService(facility_id=facility_id, service_name=service_name, category=category, available=1 if available else 0)
        db.add(row)
    else:
        row.available = 1 if available else 0
        if category:
            row.category = category
        row.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return row


def facility_services_summary(db: Session, facility_id: int) -> dict:
    ensure_catalog(db, facility_id)
    rows = db.query(FacilityService).filter(FacilityService.facility_id == facility_id).all()
    return {
        "facility_id": facility_id,
        "services": [
            {
                "id": r.id,
                "service_name": r.service_name,
                "category": r.category,
                "available": bool(r.available),
            }
            for r in rows
        ],
    }


def all_services_catalog(db: Session) -> list:
    """Distinct service names/categories across every facility (GET /services)."""
    for facility in db.query(PHC).all():
        ensure_catalog(db, facility.id)
    rows = db.query(FacilityService.service_name, FacilityService.category).distinct().all()
    return [{"service_name": name, "category": category} for name, category in rows]


def search_services(db: Session, name: str) -> list:
    """
    GET /services/search?name=MRI -- every facility currently offering a
    service whose name contains `name` (case-insensitive), with the
    facility's own details attached so the frontend doesn't need a second
    round trip.
    """
    for facility in db.query(PHC).all():
        ensure_catalog(db, facility.id)

    matches = (
        db.query(FacilityService, PHC)
        .join(PHC, FacilityService.facility_id == PHC.id)
        .filter(
            FacilityService.service_name.ilike(f"%{name}%"),
            FacilityService.available == 1,
        )
        .all()
    )
    return [
        {
            "facility_id": phc.id,
            "facility_name": phc.name,
            "facility_type": phc.type,
            "lat": phc.lat,
            "lng": phc.lng,
            "service_name": svc.service_name,
            "category": svc.category,
        }
        for svc, phc in matches
    ]
