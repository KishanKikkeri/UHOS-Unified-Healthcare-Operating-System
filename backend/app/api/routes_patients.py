from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import Prescription, PrescriptionItem, DispensingEvent, Medicine, Appointment, Patient

router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("")
def list_patients(search: Optional[str] = Query(None, description="Case-insensitive name filter"), db: Session = Depends(get_db)):
    """
    Sprint 3 addition (frontend-required, read-only): the Doctor Workspace
    needs a patient search/select control. Nothing previously listed
    patients -- only `/patients/{id}/history` existed, which requires
    already knowing the id. Read-only, no new business logic.
    """
    query = db.query(Patient)
    if search:
        query = query.filter(Patient.name.ilike(f"%{search}%"))
    patients = query.order_by(Patient.name.asc()).limit(20).all()
    return [
        {"id": p.id, "name": p.name, "dob": p.dob, "phc_home_id": p.phc_home_id}
        for p in patients
    ]


@router.get("/{patient_id}/history")
def patient_history(patient_id: int, db: Session = Depends(get_db)):
    """
    The unified view: every prescription, what was actually dispensed
    (and from where), and appointment history, in one place -- the core
    promise of the Citizen Health App.
    """
    prescriptions = db.query(Prescription).filter(Prescription.patient_id == patient_id).all()

    history = []
    for rx in prescriptions:
        items = db.query(PrescriptionItem).filter(PrescriptionItem.prescription_id == rx.id).all()
        item_details = []
        for item in items:
            medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
            dispensing = (
                db.query(DispensingEvent)
                .filter(DispensingEvent.prescription_item_id == item.id)
                .all()
            )
            item_details.append({
                "medicine": medicine.name if medicine else "unknown",
                "quantity_prescribed": item.quantity,
                "dispensing_events": [
                    {
                        "quantity": d.quantity_dispensed,
                        "from_phc_id": d.source_phc_id or d.phc_id,
                        "was_redistributed": d.source_phc_id is not None,
                        "timestamp": d.timestamp,
                    }
                    for d in dispensing
                ],
            })
        history.append({
            "prescription_id": rx.id,
            "date": rx.created_at,
            "doctor_id": rx.doctor_id,
            "items": item_details,
        })

    appointments = db.query(Appointment).filter(Appointment.patient_id == patient_id).all()

    return {
        "patient_id": patient_id,
        "prescriptions": history,
        "appointments": [
            {"id": a.id, "doctor_id": a.doctor_id, "phc_id": a.phc_id,
             "scheduled_at": a.scheduled_at, "status": a.status}
            for a in appointments
        ],
    }
