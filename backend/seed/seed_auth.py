"""
Phase 11 — Authentication & RBAC demo seed.

Additive to seed/seed_data.py: this script assumes seed_data.py has
already run (so PHCs/Doctors/Patients exist) and only adds `User` rows
plus a handful of extra Doctor/Patient rows so every demo account listed
in the Phase 11 handover doc has a believable linked identity, without
touching a single line of seed_data.py itself.

Run with: python -m seed.seed_auth
(demo_seed.py calls this automatically after seed_data.py.)
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.database import SessionLocal, Base, engine
from app.models.models import PHC, Doctor, Patient
from app.models.user import User
from app.utils.security import hash_password

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Wipe just the users table for a clean reseed (Doctor/Patient extras
# below are upserted by name so re-running never duplicates them).
db.query(User).delete()
db.commit()

facilities = {p.name: p for p in db.query(PHC).all()}
phc_nanjangud = facilities.get("PHC Nanjangud Road")
chc_hebbal = facilities.get("CHC Hebbal")
phc_bogadi = facilities.get("PHC Bogadi")
district_hospital = facilities.get("Mysuru District Hospital")

if not all([phc_nanjangud, chc_hebbal, phc_bogadi, district_hospital]):
    raise RuntimeError(
        "seed_auth.py expects seed.seed_data to have run first "
        "(run `python -m seed.demo_seed`, which runs both in order)."
    )


def get_or_create_doctor(name: str, specialization: str, phc: PHC) -> Doctor:
    existing = db.query(Doctor).filter(Doctor.name == name).first()
    if existing:
        return existing
    doc = Doctor(name=name, specialization=specialization, phc_id=phc.id, status="active")
    db.add(doc)
    db.commit()
    return doc


def get_or_create_patient(name: str, dob: str, phc: PHC) -> Patient:
    existing = db.query(Patient).filter(Patient.name == name).first()
    if existing:
        return existing
    p = Patient(name=name, dob=dob, phc_home_id=phc.id)
    db.add(p)
    db.commit()
    return p


# --- Resolve/extend Doctor rows so doctor01..doctor06 all have a real
# Doctor identity (doctor01-04 reuse the 4 doctors seed_data.py already
# creates; doctor05/06 are two believable additions). ---------------------
existing_doctors = db.query(Doctor).order_by(Doctor.id).all()
doctor_names = [d.name for d in existing_doctors]

doctor05 = get_or_create_doctor("Dr. Meera Nair", "Gynecology", phc_bogadi)
doctor06 = get_or_create_doctor("Dr. Vikram Shetty", "Emergency Medicine", district_hospital)

doctor_pool = existing_doctors[:4] + [doctor05, doctor06]
while len(doctor_pool) < 6:
    doctor_pool.append(doctor_pool[-1])  # defensive fallback, shouldn't trigger

# --- Resolve/extend Patient rows so patient01..patient10 all have a real
# Patient identity (patient01-03 reuse seed_data.py's 3 patients). --------
existing_patients = db.query(Patient).order_by(Patient.id).all()
extra_patient_seed = [
    ("Sunita Bai", "1988-06-15", phc_nanjangud),
    ("Manjunath H R", "1975-11-02", chc_hebbal),
    ("Kavitha Reddy", "1999-02-28", phc_bogadi),
    ("Naveen Kumar", "1965-08-19", district_hospital),
    ("Fatima Sheikh", "1992-12-05", phc_nanjangud),
    ("Ravi Shankar", "1983-03-30", chc_hebbal),
    ("Divya Prakash", "2003-07-22", phc_bogadi),
]
patient_pool = list(existing_patients)
for name, dob, phc in extra_patient_seed:
    patient_pool.append(get_or_create_patient(name, dob, phc))
while len(patient_pool) < 10:
    patient_pool.append(patient_pool[-1])  # defensive fallback


def make_user(username, password, full_name, role, facility=None, doctor=None, patient=None):
    db.add(
        User(
            username=username,
            hashed_password=hash_password(password),
            full_name=full_name,
            role=role,
            facility_id=facility.id if facility else None,
            doctor_id=doctor.id if doctor else None,
            patient_id=patient.id if patient else None,
        )
    )


# --- District Administrators (district-wide, no single facility) --------
make_user("admin", "admin123", "District Administrator", "district_admin")
make_user("district01", "district123", "Dr. Priya Deshmukh (District Officer)", "district_admin")
make_user("opsadmin", "ops123", "Operations Administrator", "district_admin")

# --- PHC / CHC Administrators (facility_admin, scoped to one facility) --
make_user("phc_sidd", "phc123", "PHC Siddharthanagar Admin", "facility_admin", facility=phc_nanjangud)
make_user("phc_vijaya", "phc123", "PHC Vijayanagar Admin", "facility_admin", facility=chc_hebbal)
make_user("chc_bogadi", "chc123", "CHC Bogadi Admin", "facility_admin", facility=phc_bogadi)
make_user("chc_nanjangud", "chc123", "CHC Nanjangud Admin", "facility_admin", facility=phc_nanjangud)
make_user("dh_mysuru", "dh123", "Mysuru District Hospital Admin", "facility_admin", facility=district_hospital)

# --- Doctors --------------------------------------------------------------
for i in range(6):
    doc = doctor_pool[i]
    make_user(
        f"doctor0{i + 1}",
        "doctor123",
        doc.name,
        "doctor",
        facility=db.query(PHC).filter(PHC.id == doc.phc_id).first(),
        doctor=doc,
    )

# --- Pharmacists (facility-scoped, round-robin across the 4 facilities) --
pharma_facilities = [phc_nanjangud, chc_hebbal, phc_bogadi, district_hospital, phc_nanjangud]
for i in range(5):
    make_user(f"pharma0{i + 1}", "pharma123", f"Pharmacist {i + 1}", "pharmacist", facility=pharma_facilities[i])

# --- Lab Technicians (facility-scoped, round-robin across the 4 facilities) --
lab_facilities = [phc_nanjangud, chc_hebbal, phc_bogadi, district_hospital]
for i in range(4):
    make_user(f"lab0{i + 1}", "lab123", f"Lab Technician {i + 1}", "lab_technician", facility=lab_facilities[i])

# --- Citizens --------------------------------------------------------------
for i in range(10):
    patient = patient_pool[i]
    label = f"patient{i + 1:02d}"
    make_user(label, "patient123", patient.name, "citizen", patient=patient)

db.commit()

print(f"Seeded {db.query(User).count()} demo user accounts (Phase 11 Auth).")
db.close()
