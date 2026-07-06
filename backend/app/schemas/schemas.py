from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field


class PrescriptionItemIn(BaseModel):
    medicine_id: int
    quantity: float = Field(gt=0, description="Must be a positive quantity")


class PrescriptionCreate(BaseModel):
    patient_id: int
    doctor_id: int
    appointment_id: Optional[int] = None
    items: List[PrescriptionItemIn]


class ItemOutcome(BaseModel):
    medicine_id: int
    medicine_name: str
    requested_qty: float
    status: str  # "dispensed_locally" | "dispensed_via_redistribution" | "critical_shortage"
    recommendation: dict
    explanation: dict


class PrescriptionResult(BaseModel):
    prescription_id: int
    patient_id: int
    outcomes: List[ItemOutcome]


class AppointmentCreate(BaseModel):
    patient_id: int
    doctor_id: int
    phc_id: int
    scheduled_at: datetime


class StockAlertOut(BaseModel):
    id: int
    phc_id: int
    medicine_id: int
    days_remaining: float
    recommended_transfer_qty: Optional[float]
    recommended_source_phc_id: Optional[int]
    reasoning: Optional[str]
    status: str

    class Config:
        from_attributes = True


class FacilityScoreOut(BaseModel):
    phc_id: int
    score: float
    medicine_score: float
    doctor_score: float

    class Config:
        from_attributes = True


# --- Phase X: Smart Referral & Advanced Bed Management ----------------------

class ReferralRecommendIn(BaseModel):
    source_facility_id: int
    service_name: str


class ReferralCreate(BaseModel):
    patient_id: int
    doctor_id: int
    source_facility_id: int
    service_name: str


class BedReserveIn(BaseModel):
    patient_id: int
    doctor_id: int
    referral_id: Optional[int] = None


class BedTransferIn(BaseModel):
    to_bed_id: int


class FacilityServiceUpsertIn(BaseModel):
    service_name: str
    category: Optional[str] = None
    available: bool = True


class BedUnitCreate(BaseModel):
    bed_number: str
    ward: str
    bed_type: str = "General"
