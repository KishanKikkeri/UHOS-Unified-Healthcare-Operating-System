"""
Core data models for UHOS.

Rule (ARCHITECTURE_DECISIONS.md #003): derived tables (FacilityScore,
StockAlert) are NEVER written to directly by API handlers. They are only
ever written by the Pulse AI services, triggered by the Event Engine.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON
)
from sqlalchemy.orm import relationship
from app.db.database import Base


class PHC(Base):
    __tablename__ = "phcs"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    district = Column(String, nullable=False)
    type = Column(String, default="PHC")  # PHC or CHC
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)

    inventory = relationship("Inventory", back_populates="phc")
    doctors = relationship("Doctor", back_populates="phc")


class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    specialization = Column(String, nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=False)
    status = Column(String, default="active")  # active / absent

    phc = relationship("PHC", back_populates="doctors")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    dob = Column(String, nullable=True)
    phc_home_id = Column(Integer, ForeignKey("phcs.id"), nullable=True)


class Medicine(Base):
    __tablename__ = "medicines"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False, unique=True)
    unit = Column(String, default="tablets")


class Inventory(Base):
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True)
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    stock_qty = Column(Float, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

    phc = relationship("PHC", back_populates="inventory")
    medicine = relationship("Medicine")


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    status = Column(String, default="booked")  # booked / completed / cancelled


class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(Integer, primary_key=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=False)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=False)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("PrescriptionItem", back_populates="prescription")


class PrescriptionItem(Base):
    __tablename__ = "prescription_items"

    id = Column(Integer, primary_key=True)
    prescription_id = Column(Integer, ForeignKey("prescriptions.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    quantity = Column(Float, nullable=False)

    prescription = relationship("Prescription", back_populates="items")
    medicine = relationship("Medicine")


class DispensingEvent(Base):
    """
    The linchpin table. Every read (patient history, PHC stock level,
    district consumption trend) derives from this append-only log.
    """
    __tablename__ = "dispensing_events"

    id = Column(Integer, primary_key=True)
    prescription_item_id = Column(Integer, ForeignKey("prescription_items.id"), nullable=False)
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=False)
    source_phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=True)  # set only on redistribution
    quantity_dispensed = Column(Float, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)


class FacilityScore(Base):
    __tablename__ = "facility_scores"

    id = Column(Integer, primary_key=True)
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=False)
    score = Column(Float)
    medicine_score = Column(Float)
    doctor_score = Column(Float)
    computed_at = Column(DateTime, default=datetime.utcnow)


class StockAlert(Base):
    __tablename__ = "stock_alerts"

    id = Column(Integer, primary_key=True)
    phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=False)
    medicine_id = Column(Integer, ForeignKey("medicines.id"), nullable=False)
    days_remaining = Column(Float)
    recommended_transfer_qty = Column(Float, nullable=True)
    recommended_source_phc_id = Column(Integer, ForeignKey("phcs.id"), nullable=True)
    reasoning = Column(Text, nullable=True)  # human-readable "Why?" explanation
    status = Column(String, default="open")  # open / resolved
    created_at = Column(DateTime, default=datetime.utcnow)


class AIDecisionLog(Base):
    """
    Every Pulse AI recommendation gets logged here with its exact inputs
    and outputs, so any decision is reproducible and auditable on demand.
    """
    __tablename__ = "ai_decision_logs"

    id = Column(Integer, primary_key=True)
    engine = Column(String, nullable=False)  # "forecast" | "redistribution" | "facility_score"
    input_json = Column(JSON, nullable=True)
    output_json = Column(JSON, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)


class Event(Base):
    """
    Append-only event log — the backbone of the Event Engine.
    Every meaningful action in the system writes one row here, which is
    what triggers Pulse AI recomputation (Rule #1 in ARCHITECTURE_DECISIONS.md).
    """
    __tablename__ = "events"

    id = Column(Integer, primary_key=True)
    event_type = Column(String, nullable=False)  # e.g. "medicine_dispensed"
    payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
