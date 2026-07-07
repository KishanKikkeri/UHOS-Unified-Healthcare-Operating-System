"""
Phase 11 — Authentication & RBAC.

Additive table: does not touch any existing model. Follows the same plain
SQLAlchemy-column style as models.py. A User optionally links to a PHC
(facility) via facility_id -- District Admins have facility_id = None
since they operate district-wide; every other role is scoped to one
facility (or, for Doctor/Citizen, to their linked doctor_id/patient_id so
existing doctor/patient data can be reused without duplicating it).
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String, nullable=False, unique=True, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    role = Column(String, nullable=False)
    # district_admin | facility_admin | doctor | pharmacist | lab_technician | citizen

    facility_id = Column(Integer, ForeignKey("phcs.id"), nullable=True)
    doctor_id = Column(Integer, ForeignKey("doctors.id"), nullable=True)
    patient_id = Column(Integer, ForeignKey("patients.id"), nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
