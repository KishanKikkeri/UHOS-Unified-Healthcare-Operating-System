"""
Forecast Engine (part of Pulse AI).

ADR-001: No trained ML models. Every number here is a plain formula that
can be recited to a judge in one breath. This is deliberate -- see
ARCHITECTURE_DECISIONS.md Decision #001.
"""
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import DispensingEvent, Inventory, PrescriptionItem

LOOKBACK_DAYS = 7
SAFETY_THRESHOLD_DAYS = 5


def avg_daily_consumption(db: Session, phc_id: int, medicine_id: int) -> float:
    """
    Average units of `medicine_id` dispensed per day at `phc_id` over the
    last LOOKBACK_DAYS. Joins through PrescriptionItem since DispensingEvent
    only stores prescription_item_id, not medicine_id directly.
    """
    since = datetime.utcnow() - timedelta(days=LOOKBACK_DAYS)
    total = (
        db.query(func.coalesce(func.sum(DispensingEvent.quantity_dispensed), 0.0))
        .join(PrescriptionItem, DispensingEvent.prescription_item_id == PrescriptionItem.id)
        .filter(
            DispensingEvent.phc_id == phc_id,
            PrescriptionItem.medicine_id == medicine_id,
            DispensingEvent.timestamp >= since,
        )
        .scalar()
    )
    # Guard against division by zero for a brand-new medicine/PHC pair with
    # no dispensing history yet -- treat as very low baseline demand.
    return max(total / LOOKBACK_DAYS, 0.01)


def current_stock(db: Session, phc_id: int, medicine_id: int) -> float:
    inv = (
        db.query(Inventory)
        .filter(Inventory.phc_id == phc_id, Inventory.medicine_id == medicine_id)
        .first()
    )
    return inv.stock_qty if inv else 0.0


def forecast_days_remaining(db: Session, phc_id: int, medicine_id: int, consumption_rate: float) -> dict:
    """
    Returns the full explainable breakdown, not just a number, so the
    "Why?" button in the UI has something real to show.
    """
    stock = current_stock(db, phc_id, medicine_id)
    days_remaining = round(stock / consumption_rate, 1) if consumption_rate > 0 else float("inf")

    return {
        "current_stock": stock,
        "avg_daily_consumption": round(consumption_rate, 2),
        "days_remaining": days_remaining,
        "safety_threshold_days": SAFETY_THRESHOLD_DAYS,
        "is_critical": days_remaining < SAFETY_THRESHOLD_DAYS,
        "calculation": f"{stock} units / {round(consumption_rate, 2)} units per day = {days_remaining} days remaining",
    }
