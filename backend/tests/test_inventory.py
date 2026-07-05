"""Inventory smoke tests: stock decrements correctly and never goes negative."""
from app.api.routes_prescriptions import _atomic_decrement


def test_stock_decrement(db_session, seeded_db):
    phc = seeded_db["phc_a"]
    med = seeded_db["med_high"]  # starts at 500

    ok = _atomic_decrement(db_session, phc.id, med.id, 50)

    assert ok is True
    from app.models.models import Inventory
    row = (
        db_session.query(Inventory)
        .filter(Inventory.phc_id == phc.id, Inventory.medicine_id == med.id)
        .first()
    )
    assert row.stock_qty == 450


def test_no_negative_inventory(db_session, seeded_db):
    phc = seeded_db["phc_a"]
    med = seeded_db["med_low"]  # starts at 2

    ok = _atomic_decrement(db_session, phc.id, med.id, 999)

    assert ok is False
    from app.models.models import Inventory
    row = (
        db_session.query(Inventory)
        .filter(Inventory.phc_id == phc.id, Inventory.medicine_id == med.id)
        .first()
    )
    # Unchanged -- the conditional UPDATE must not have applied.
    assert row.stock_qty == 2
