from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.models import (
    Prescription, PrescriptionItem, Inventory, Medicine, DispensingEvent,
    Doctor, Patient
)
from app.schemas.schemas import PrescriptionCreate, PrescriptionResult, ItemOutcome
from app.services.forecast import avg_daily_consumption, forecast_days_remaining
from app.services.redistribution import find_redistribution_source
from app.services.event_engine import on_medicine_dispensed, record_event, log_ai_decision

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


def _atomic_decrement(db: Session, phc_id: int, medicine_id: int, qty: float) -> bool:
    """
    Race-safe stock decrement (Sprint 1.5 Case 9): a single conditional
    UPDATE statement, so two simultaneous prescriptions can't both pass a
    Python-level "if available >= qty" check and drive stock negative.
    Returns True if the decrement succeeded, False if stock was
    insufficient at the moment the UPDATE actually ran.
    """
    result = (
        db.query(Inventory)
        .filter(
            Inventory.phc_id == phc_id,
            Inventory.medicine_id == medicine_id,
            Inventory.stock_qty >= qty,
        )
        .update({Inventory.stock_qty: Inventory.stock_qty - qty}, synchronize_session=False)
    )
    db.commit()
    return result > 0


@router.post("", response_model=PrescriptionResult)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    """
    Hero Flow 1: Doctor prescribes -> Pulse AI verifies stock for each item ->
    dispenses locally, redistributes from a surplus facility, or flags a
    district-level shortage -- with a full, reproducible explanation.
    """
    doctor = db.query(Doctor).filter(Doctor.id == payload.doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if doctor.status != "active":
        raise HTTPException(status_code=400, detail="Cannot prescribe: doctor is marked absent/inactive")

    patient = db.query(Patient).filter(Patient.id == payload.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    phc_id = doctor.phc_id

    prescription = Prescription(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        appointment_id=payload.appointment_id,
    )
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    record_event(db, "prescription_created", {"prescription_id": prescription.id, "patient_id": patient.id})

    outcomes = []

    for item in payload.items:
        medicine = db.query(Medicine).filter(Medicine.id == item.medicine_id).first()
        if not medicine:
            raise HTTPException(status_code=404, detail=f"Medicine {item.medicine_id} not found")

        rx_item = PrescriptionItem(
            prescription_id=prescription.id,
            medicine_id=item.medicine_id,
            quantity=item.quantity,
        )
        db.add(rx_item)
        db.commit()
        db.refresh(rx_item)

        inv = (
            db.query(Inventory)
            .filter(Inventory.phc_id == phc_id, Inventory.medicine_id == item.medicine_id)
            .first()
        )
        available = inv.stock_qty if inv else 0.0
        rate = avg_daily_consumption(db, phc_id, item.medicine_id)
        breakdown = forecast_days_remaining(db, phc_id, item.medicine_id, rate)
        log_ai_decision(db, "forecast", {"phc_id": phc_id, "medicine_id": item.medicine_id}, breakdown)

        base_explanation = {
            "current_stock": breakdown["current_stock"],
            "avg_daily_consumption": breakdown["avg_daily_consumption"],
            "days_remaining": breakdown["days_remaining"],
            "safety_threshold": breakdown["safety_threshold_days"],
        }

        if available >= item.quantity and _atomic_decrement(db, phc_id, item.medicine_id, item.quantity):
            db.add(DispensingEvent(
                prescription_item_id=rx_item.id, phc_id=phc_id,
                quantity_dispensed=item.quantity,
            ))
            db.commit()
            on_medicine_dispensed(db, phc_id, item.medicine_id, {
                "prescription_item_id": rx_item.id, "quantity": item.quantity
            })

            outcomes.append(ItemOutcome(
                medicine_id=medicine.id, medicine_name=medicine.name,
                requested_qty=item.quantity, status="dispensed_locally",
                recommendation={"action": "dispense_locally", "facility": "current PHC", "quantity": item.quantity},
                explanation={**base_explanation, "reason": "Sufficient local stock to fulfil the prescription."},
            ))
            continue

        # Local stock insufficient (or a race condition just consumed it) -- refresh and try redistribution
        inv = db.query(Inventory).filter(Inventory.phc_id == phc_id, Inventory.medicine_id == item.medicine_id).first()
        available = inv.stock_qty if inv else 0.0
        shortfall = item.quantity - available
        source = find_redistribution_source(db, phc_id, item.medicine_id, shortfall)
        log_ai_decision(
            db, "redistribution",
            {"phc_id": phc_id, "medicine_id": item.medicine_id, "shortfall": shortfall},
            source or {"result": "no_surplus_facility_found"},
        )

        if source and _atomic_decrement(db, source["source_phc_id"], item.medicine_id, shortfall):
            if available > 0:
                _atomic_decrement(db, phc_id, item.medicine_id, available)
                db.add(DispensingEvent(prescription_item_id=rx_item.id, phc_id=phc_id, quantity_dispensed=available))
            db.add(DispensingEvent(
                prescription_item_id=rx_item.id, phc_id=phc_id,
                source_phc_id=source["source_phc_id"], quantity_dispensed=shortfall,
            ))
            db.commit()
            on_medicine_dispensed(db, phc_id, item.medicine_id, {
                "prescription_item_id": rx_item.id, "quantity": item.quantity,
                "redistributed_from": source["source_phc_id"],
            })

            outcomes.append(ItemOutcome(
                medicine_id=medicine.id, medicine_name=medicine.name,
                requested_qty=item.quantity, status="dispensed_via_redistribution",
                recommendation={
                    "action": "transfer", "source_facility": source["source_phc_name"],
                    "transfer_quantity": shortfall,
                },
                explanation={
                    **base_explanation,
                    "reason": "Stock expected to exhaust before safety threshold.",
                    "selected_source": "Nearest facility with surplus after retaining its own safety buffer.",
                    "distance_km": source["distance_km"],
                },
            ))
        else:
            # Case 3: no facility anywhere has enough surplus -- genuine district shortage
            outcomes.append(ItemOutcome(
                medicine_id=medicine.id, medicine_name=medicine.name,
                requested_qty=item.quantity, status="critical_shortage",
                recommendation={
                    "action": "emergency_procurement",
                    "reason": "No facility in the district has sufficient surplus to cover this shortfall.",
                },
                explanation={
                    **base_explanation,
                    "reason": "District-wide shortage: every facility is at or below its own safety buffer for this medicine.",
                },
            ))

    return PrescriptionResult(prescription_id=prescription.id, patient_id=prescription.patient_id, outcomes=outcomes)
