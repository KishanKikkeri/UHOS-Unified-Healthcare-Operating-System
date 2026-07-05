"""
Redistribution smoke tests, covering the three prescription outcomes from
the handover doc's hero flow: local dispense, cross-facility redistribution,
and emergency procurement (district-wide shortage).
"""
from app.services.redistribution import find_redistribution_source


def _prescribe(client, doctor_id, patient_id, medicine_id, quantity):
    return client.post(
        "/prescriptions",
        json={
            "doctor_id": doctor_id,
            "patient_id": patient_id,
            "items": [{"medicine_id": medicine_id, "quantity": quantity}],
        },
    )


def test_local_dispense(client, seeded_db):
    resp = _prescribe(
        client,
        seeded_db["doc_a"].id,
        seeded_db["patient"].id,
        seeded_db["med_high"].id,
        10,
    )
    assert resp.status_code == 200
    outcome = resp.json()["outcomes"][0]
    assert outcome["status"] == "dispensed_locally"


def test_cross_facility_redistribution(client, seeded_db):
    # phc_a only has 2 units of med_low; phc_b has 500 surplus -> should
    # transfer the shortfall from phc_b.
    resp = _prescribe(
        client,
        seeded_db["doc_a"].id,
        seeded_db["patient"].id,
        seeded_db["med_low"].id,
        10,
    )
    assert resp.status_code == 200
    outcome = resp.json()["outcomes"][0]
    assert outcome["status"] == "dispensed_via_redistribution"
    assert outcome["recommendation"]["source_facility"] == seeded_db["phc_b"].name


def test_emergency_procurement_on_district_shortage(db_session, client, seeded_db):
    # Drain phc_b's surplus of med_low too, so no facility anywhere has
    # enough -- this should fall through to critical_shortage.
    from app.models.models import Inventory

    row = (
        db_session.query(Inventory)
        .filter(Inventory.phc_id == seeded_db["phc_b"].id, Inventory.medicine_id == seeded_db["med_low"].id)
        .first()
    )
    row.stock_qty = 1
    db_session.commit()

    resp = _prescribe(
        client,
        seeded_db["doc_a"].id,
        seeded_db["patient"].id,
        seeded_db["med_low"].id,
        10,
    )
    assert resp.status_code == 200
    outcome = resp.json()["outcomes"][0]
    assert outcome["status"] == "critical_shortage"
    assert outcome["recommendation"]["action"] == "emergency_procurement"


def test_find_redistribution_source_picks_nearest_with_surplus(db_session, seeded_db):
    source = find_redistribution_source(db_session, seeded_db["phc_a"].id, seeded_db["med_low"].id, 10)
    assert source is not None
    assert source["source_phc_id"] == seeded_db["phc_b"].id
