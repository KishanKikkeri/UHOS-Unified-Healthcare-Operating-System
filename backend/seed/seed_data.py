"""
Seeds a believable small district: 3 facilities, doctors, a medicine
catalog, starting inventory, a couple of patients, and a week of
historical dispensing events so forecasts show a real trend immediately
instead of an empty "no data" state on demo day.

Run with: python -m seed.seed_data
"""
import random
from datetime import datetime, timedelta
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.db.database import SessionLocal, Base, engine
from app.models.models import (
    PHC, Doctor, Patient, Medicine, Inventory, Prescription,
    PrescriptionItem, DispensingEvent
)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Wipe existing data for a clean reseed
for model in [DispensingEvent, PrescriptionItem, Prescription, Inventory,
              Doctor, Patient, Medicine, PHC]:
    db.query(model).delete()
db.commit()

# --- Facilities (real-ish Mysuru-district-style coordinates, spaced a few km apart) ---
phc_a = PHC(name="PHC Nanjangud Road", district="Mysuru", type="PHC", lat=12.2600, lng=76.6500)
phc_b = PHC(name="CHC Hebbal", district="Mysuru", type="CHC", lat=12.3400, lng=76.6200)
phc_c = PHC(name="PHC Bogadi", district="Mysuru", type="PHC", lat=12.3100, lng=76.5800)
db.add_all([phc_a, phc_b, phc_c])
db.commit()

# --- Doctors ---
doctors = [
    Doctor(name="Dr. Anitha Rao", specialization="General Medicine", phc_id=phc_a.id, status="active"),
    Doctor(name="Dr. Suresh Mehta", specialization="Orthopedics", phc_id=phc_b.id, status="active"),
    Doctor(name="Dr. Farhan Ali", specialization="Pediatrics", phc_id=phc_c.id, status="active"),
    Doctor(name="Dr. Kavya Iyer", specialization="General Medicine", phc_id=phc_b.id, status="absent"),
]
db.add_all(doctors)
db.commit()

# --- Medicines ---
medicines = [
    Medicine(name="Paracetamol", unit="tablets"),
    Medicine(name="Amoxicillin", unit="capsules"),
    Medicine(name="ORS Sachets", unit="sachets"),
    Medicine(name="Vitamin D", unit="tablets"),
]
db.add_all(medicines)
db.commit()

# --- Starting inventory: deliberately uneven so the redistribution demo has a real gap ---
inventory_plan = {
    phc_a.id: {"Paracetamol": 120, "Amoxicillin": 15, "ORS Sachets": 300, "Vitamin D": 80},
    phc_b.id: {"Paracetamol": 40, "Amoxicillin": 960, "ORS Sachets": 50, "Vitamin D": 200},
    phc_c.id: {"Paracetamol": 200, "Amoxicillin": 300, "ORS Sachets": 20, "Vitamin D": 60},
}
medicine_by_name = {m.name: m for m in medicines}

for phc_id, stocks in inventory_plan.items():
    for med_name, qty in stocks.items():
        db.add(Inventory(phc_id=phc_id, medicine_id=medicine_by_name[med_name].id, stock_qty=qty))
db.commit()

# --- Patients ---
patients = [
    Patient(name="Ramesh Gowda", dob="1980-04-12", phc_home_id=phc_a.id),
    Patient(name="Lakshmi Devi", dob="1995-09-03", phc_home_id=phc_b.id),
    Patient(name="Arjun Kumar", dob="2001-01-20", phc_home_id=phc_c.id),
]
db.add_all(patients)
db.commit()

# --- Historical dispensing events (last 7 days) so consumption rate is non-zero at demo start ---
# Paracetamol at PHC A is deliberately consumed fast -> creates a real, live "critical" alert.
doctor_a = doctors[0]
random.seed(42)

for day_offset in range(7, 0, -1):
    ts = datetime.utcnow() - timedelta(days=day_offset, hours=random.randint(0, 10))

    rx = Prescription(patient_id=patients[0].id, doctor_id=doctor_a.id)
    db.add(rx)
    db.commit()
    db.refresh(rx)

    qty = random.randint(14, 20)  # ~52/week average, matches the example in the design doc
    item = PrescriptionItem(prescription_id=rx.id, medicine_id=medicine_by_name["Paracetamol"].id, quantity=qty)
    db.add(item)
    db.commit()
    db.refresh(item)

    db.add(DispensingEvent(
        prescription_item_id=item.id, phc_id=phc_a.id,
        quantity_dispensed=qty, timestamp=ts,
    ))

db.commit()

print("Seed complete: 3 facilities, 4 doctors, 4 medicines, 3 patients, 7 days of dispensing history.")
print(f"PHC A id={phc_a.id}, CHC B id={phc_b.id}, PHC C id={phc_c.id}")

db.close()
