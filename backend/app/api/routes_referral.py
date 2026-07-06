"""
Phase X — Smart Referral & Advanced Bed Management.

All endpoints are additive; nothing in routes_dashboard.py, routes_patients.py
or routes_operations.py is modified. Same constraints as Phase 5: no auth,
no ML, deterministic Pulse AI only.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.models import PHC, Patient, Doctor, Referral, BedUnit
from app.schemas.schemas import (
    ReferralRecommendIn, ReferralCreate, BedReserveIn, BedTransferIn,
    FacilityServiceUpsertIn, BedUnitCreate,
)
from app.services import facility_services as services_svc
from app.services import referral as referral_svc
from app.services import bed_allocation as beds_svc
from app.services.event_engine import (
    on_referral_created, on_bed_reserved, on_bed_released, on_bed_transferred,
)

router = APIRouter(tags=["referral"])


# --- Module 2: Facility Services Directory ----------------------------------

@router.get("/services")
def list_all_services(db: Session = Depends(get_db)):
    return services_svc.all_services_catalog(db)


@router.get("/services/search")
def search_services(name: str, db: Session = Depends(get_db)):
    return services_svc.search_services(db, name)


@router.get("/facilities/{facility_id}/services")
def get_facility_services(facility_id: int, db: Session = Depends(get_db)):
    facility = db.query(PHC).filter(PHC.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return services_svc.facility_services_summary(db, facility_id)


@router.put("/facilities/{facility_id}/services")
def upsert_facility_service(facility_id: int, payload: FacilityServiceUpsertIn, db: Session = Depends(get_db)):
    facility = db.query(PHC).filter(PHC.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    row = services_svc.upsert_service(db, facility_id, payload.service_name, payload.category, payload.available)
    return {"id": row.id, "facility_id": facility_id, "service_name": row.service_name, "category": row.category, "available": bool(row.available)}


# --- Module 1: Smart Referral Engine ----------------------------------------

@router.post("/referrals/recommend")
def recommend_referral(payload: ReferralRecommendIn, db: Session = Depends(get_db)):
    """Preview: what would Pulse AI recommend, without creating a referral."""
    facility = db.query(PHC).filter(PHC.id == payload.source_facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")

    recommendation = referral_svc.recommend_facility(db, payload.source_facility_id, payload.service_name)
    if not recommendation:
        return {"recommended_facility_id": None, "reasoning": f"No facility currently offers {payload.service_name}."}
    return recommendation


@router.post("/referrals")
def create_referral(payload: ReferralCreate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    source = db.query(PHC).filter(PHC.id == payload.source_facility_id).first()
    if not patient or not doctor or not source:
        raise HTTPException(status_code=404, detail="Patient, doctor, or source facility not found")

    result = referral_svc.create_referral(db, payload.patient_id, payload.doctor_id, payload.source_facility_id, payload.service_name)
    on_referral_created(db, result["referral"], result["recommendation"])

    return {
        "referral": referral_svc.serialize_referral(result["referral"]),
        "recommendation": result["recommendation"],
    }


@router.get("/referrals/{referral_id}")
def get_referral(referral_id: int, db: Session = Depends(get_db)):
    referral = db.query(Referral).filter(Referral.id == referral_id).first()
    if not referral:
        raise HTTPException(status_code=404, detail="Referral not found")
    return referral_svc.serialize_referral(referral)


# --- Module 5: Citizen Referral Tracking ------------------------------------

@router.get("/patients/{patient_id}/referrals")
def get_patient_referrals(patient_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return referral_svc.patient_referrals(db, patient_id)


# --- Referral Analytics (Nice to Have) ---------------------------------------

@router.get("/district/referrals")
def get_district_referral_analytics(db: Session = Depends(get_db)):
    return referral_svc.district_referral_summary(db)


# --- Module 3: Doctor Bed Allocation -----------------------------------------

@router.post("/facilities/{facility_id}/beds/units")
def create_bed_unit(facility_id: int, payload: BedUnitCreate, db: Session = Depends(get_db)):
    facility = db.query(PHC).filter(PHC.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    bed = beds_svc.create_bed_unit(db, facility_id, payload.bed_number, payload.ward, payload.bed_type)
    return beds_svc.serialize_bed(bed)


@router.get("/facilities/{facility_id}/beds/units")
def list_bed_units(facility_id: int, ward: str = None, db: Session = Depends(get_db)):
    return beds_svc.list_facility_beds(db, facility_id, ward)


@router.put("/beds/{bed_id}/reserve")
def reserve_bed(bed_id: int, payload: BedReserveIn, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not patient or not doctor:
        raise HTTPException(status_code=404, detail="Patient or doctor not found")

    bed = beds_svc.get_bed(db, bed_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    if bed.status != "available":
        raise HTTPException(status_code=400, detail=f"Bed is currently '{bed.status}', not available")

    result = beds_svc.reserve_bed(db, bed_id, payload.patient_id, payload.doctor_id)
    on_bed_reserved(db, result, payload.referral_id)

    if payload.referral_id:
        referral = db.query(Referral).filter(Referral.id == payload.referral_id).first()
        if referral:
            referral.bed_unit_id = bed_id
            referral.status = "confirmed"
            db.commit()

    return result


@router.put("/beds/{bed_id}/release")
def release_bed(bed_id: int, db: Session = Depends(get_db)):
    bed = beds_svc.get_bed(db, bed_id)
    if not bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    result = beds_svc.release_bed(db, bed_id)
    on_bed_released(db, result)
    return result


@router.put("/beds/{bed_id}/transfer")
def transfer_bed(bed_id: int, payload: BedTransferIn, db: Session = Depends(get_db)):
    from_bed = beds_svc.get_bed(db, bed_id)
    to_bed = beds_svc.get_bed(db, payload.to_bed_id)
    if not from_bed or not to_bed:
        raise HTTPException(status_code=404, detail="Bed not found")
    if to_bed.status != "available":
        raise HTTPException(status_code=400, detail="Destination bed is not available")

    result = beds_svc.transfer_bed(db, bed_id, payload.to_bed_id)
    on_bed_transferred(db, result["from_bed"], result["to_bed"])
    return result


# --- Module 4: Ward-wise Bed Status ------------------------------------------

@router.get("/facilities/{facility_id}/wards")
def get_facility_wards(facility_id: int, db: Session = Depends(get_db)):
    facility = db.query(PHC).filter(PHC.id == facility_id).first()
    if not facility:
        raise HTTPException(status_code=404, detail="Facility not found")
    return beds_svc.ward_summary(db, facility_id)


@router.get("/district/wards")
def get_district_wards(db: Session = Depends(get_db)):
    """Feeds the Ward-wise Bed Status card on the District Command Center."""
    return beds_svc.district_ward_summary(db)
