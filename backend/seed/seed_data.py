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
    PrescriptionItem, DispensingEvent, DoctorAttendance, Bed, FacilityTest,
    FacilityService, BedUnit, Referral
)

Base.metadata.create_all(bind=engine)
db = SessionLocal()

# Wipe existing data for a clean reseed
for model in [Referral, BedUnit, FacilityService, DispensingEvent, PrescriptionItem, Prescription, Inventory,
              DoctorAttendance, Bed, FacilityTest,
              Doctor, Patient, Medicine, PHC]:
    db.query(model).delete()
db.commit()

# --- Facilities (real-ish Mysuru-district-style coordinates, spaced a few km apart) ---
phc_a = PHC(name="PHC Nanjangud Road", district="Mysuru", type="PHC", lat=12.2600, lng=76.6500)
phc_b = PHC(name="CHC Hebbal", district="Mysuru", type="CHC", lat=12.3400, lng=76.6200)
phc_c = PHC(name="PHC Bogadi", district="Mysuru", type="PHC", lat=12.3100, lng=76.5800)
# Phase X: a District Hospital so the Smart Referral Engine has a real
# "next level of care" destination with MRI/ICU/etc, per the handover doc.
district_hospital = PHC(name="Mysuru District Hospital", district="Mysuru", type="District Hospital", lat=12.2958, lng=76.6394)
db.add_all([phc_a, phc_b, phc_c, district_hospital])
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

# --- Phase 5: Appointments over the last 7 days + today, so Patient
# Footfall (Module 3) has real weekly/peak-hour/today data on demo start. ---
from app.models.models import Appointment  # noqa: E402

appt_hours = [9, 9, 10, 11, 11, 14, 15]  # deliberately clustered so a peak hour emerges
for day_offset in range(7, -1, -1):  # 7 days ago through today
    day = datetime.utcnow() - timedelta(days=day_offset)
    for i, hour in enumerate(appt_hours[: random.randint(3, len(appt_hours))]):
        patient = patients[i % len(patients)]
        doctor = doctors[i % len(doctors)]
        db.add(Appointment(
            patient_id=patient.id,
            doctor_id=doctor.id,
            phc_id=doctor.phc_id,
            scheduled_at=day.replace(hour=hour, minute=0, second=0, microsecond=0),
            status="completed" if day_offset > 0 else "booked",
        ))
db.commit()

# --- Phase 5, Module 1: today's attendance mirrors each doctor's seeded status. ---
today = datetime.utcnow().strftime("%Y-%m-%d")
for doc in doctors:
    status = "present" if doc.status == "active" else "absent"
    db.add(DoctorAttendance(
        doctor_id=doc.id, date=today, status=status,
        check_in_time=datetime.utcnow() if status == "present" else None,
    ))
db.commit()

# --- Phase 5, Module 2: bed counts, deliberately uneven so one facility
# crosses the 90% occupancy alert threshold for the demo. ---
bed_plan = {
    phc_a.id: {"total": 40, "occupied": 38, "reserved": 1},   # >90% -> alert
    phc_b.id: {"total": 60, "occupied": 30, "reserved": 5},
    phc_c.id: {"total": 25, "occupied": 10, "reserved": 2},
}
for phc_id, counts in bed_plan.items():
    db.add(Bed(facility_id=phc_id, **counts))
db.commit()

# --- Phase 5, Module 4: test availability, with one common test missing at
# PHC A so the "alternative facility" recommendation has something to show. ---
test_plan = {
    phc_a.id: {"CBC": True, "Blood Sugar": True, "ECG": False, "X-Ray": True, "Ultrasound": False},
    phc_b.id: {"CBC": True, "Blood Sugar": True, "ECG": True, "X-Ray": True, "Ultrasound": True},
    phc_c.id: {"CBC": True, "Blood Sugar": True, "ECG": True, "X-Ray": False, "Ultrasound": False},
}
for phc_id, tests in test_plan.items():
    for test_name, available in tests.items():
        db.add(FacilityTest(facility_id=phc_id, test_name=test_name, available=1 if available else 0))
db.commit()

print("Phase 5 seed complete: appointments, doctor attendance, beds, and test availability seeded.")

# --- Phase X, Module 2: Facility Services Directory. District Hospital
# gets the full advanced catalog; PHC A deliberately has no MRI so the
# Smart Referral demo has a real gap to fill. ---
service_plan = {
    phc_a.id: [("General OPD", "Consultation"), ("Vaccination", "Preventive"), ("Blood Sugar", "Diagnostic"), ("BP", "Diagnostic"), ("ECG", "Diagnostic")],
    phc_b.id: [("Emergency", "Critical Care"), ("Ultrasound", "Diagnostic"), ("X-Ray", "Diagnostic"), ("Lab", "Diagnostic"), ("Minor Surgery", "Surgical")],
    phc_c.id: [("General OPD", "Consultation"), ("Vaccination", "Preventive"), ("BP", "Diagnostic")],
    district_hospital.id: [("MRI", "Diagnostic"), ("CT Scan", "Diagnostic"), ("ICU", "Critical Care"), ("Blood Bank", "Critical Care"), ("Cardiology", "Specialist"), ("Neurology", "Specialist")],
}
for phc_id, svc_list in service_plan.items():
    for service_name, category in svc_list:
        db.add(FacilityService(facility_id=phc_id, service_name=service_name, category=category, available=1))
db.commit()

# --- Phase X, Module 3/4: individually addressable beds across wards.
# District Hospital has a free ICU + General bed so the referral demo
# resolves to "Recommended Facility: District Hospital ... available bed". ---
bed_unit_plan = {
    phc_a.id: [("A1", "General Ward"), ("A2", "General Ward"), ("A3", "General Ward")],
    phc_b.id: [("B1", "General Ward"), ("B2", "Emergency"), ("B3", "Emergency")],
    phc_c.id: [("C1", "General Ward"), ("C2", "General Ward")],
    district_hospital.id: [
        ("G-10", "General Ward"), ("G-11", "General Ward"), ("G-12", "General Ward"),
        ("ICU-1", "ICU"), ("ICU-2", "ICU"),
        ("M-1", "Maternity"), ("M-2", "Maternity"),
    ],
}
bed_units_by_key = {}
for phc_id, units in bed_unit_plan.items():
    for bed_number, ward in units:
        bed = BedUnit(facility_id=phc_id, bed_number=bed_number, ward=ward, bed_type="General", status="available")
        db.add(bed)
        db.flush()
        bed_units_by_key[(phc_id, bed_number)] = bed
db.commit()

# Occupy/reserve a few so the Ward-wise Bed Status card shows a realistic mix.
bed_units_by_key[(district_hospital.id, "G-10")].status = "occupied"
bed_units_by_key[(district_hospital.id, "ICU-1")].status = "occupied"
bed_units_by_key[(phc_a.id, "A1")].status = "occupied"
db.commit()

print("Phase X seed complete: District Hospital, facility services directory, and ward-wise bed units seeded.")
print(f"District Hospital id={district_hospital.id}")

db.close()
