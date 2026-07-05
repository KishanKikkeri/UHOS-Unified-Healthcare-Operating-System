"""
Redistribution Engine (part of Pulse AI).

When a PHC can't fulfil a prescription, this finds the nearest facility
with enough surplus to cover the shortfall, using real lat/lng distance
(haversine) -- not a hardcoded "nearby CHC" placeholder.
"""
from math import radians, sin, cos, sqrt, atan2
from typing import Optional
from sqlalchemy.orm import Session
from app.models.models import Inventory, PHC
from app.services.forecast import avg_daily_consumption, SAFETY_THRESHOLD_DAYS

EARTH_RADIUS_KM = 6371.0


def haversine_km(lat1, lng1, lat2, lng2) -> float:
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlng / 2) ** 2
    return EARTH_RADIUS_KM * 2 * atan2(sqrt(a), sqrt(1 - a))


def find_redistribution_source(
    db: Session, requesting_phc_id: int, medicine_id: int, shortfall_qty: float
) -> Optional[dict]:
    """
    Looks across all other facilities for one with enough surplus stock to
    cover `shortfall_qty` while staying above its own safety threshold,
    picks the nearest such facility, and returns the full "Why?" reasoning.
    """
    requesting_phc = db.query(PHC).filter(PHC.id == requesting_phc_id).first()
    if not requesting_phc:
        return None

    candidates = (
        db.query(Inventory, PHC)
        .join(PHC, Inventory.phc_id == PHC.id)
        .filter(Inventory.medicine_id == medicine_id, PHC.id != requesting_phc_id)
        .all()
    )

    best = None
    best_distance = None

    for inv, phc in candidates:
        consumption_rate = avg_daily_consumption(db, phc.id, medicine_id)
        # Surplus = stock left over after reserving enough to keep THIS
        # facility above the safety threshold itself.
        reserve_needed = consumption_rate * SAFETY_THRESHOLD_DAYS
        surplus = inv.stock_qty - reserve_needed

        if surplus >= shortfall_qty:
            distance = haversine_km(requesting_phc.lat, requesting_phc.lng, phc.lat, phc.lng)
            if best_distance is None or distance < best_distance:
                best = {
                    "source_phc_id": phc.id,
                    "source_phc_name": phc.name,
                    "distance_km": round(distance, 1),
                    "available_surplus": round(surplus, 1),
                    "transfer_qty": shortfall_qty,
                }
                best_distance = distance

    if not best:
        return None

    best["reason"] = (
        f"{best['source_phc_name']} is {best['distance_km']} km away with "
        f"{best['available_surplus']} units of surplus after keeping its own "
        f"{SAFETY_THRESHOLD_DAYS}-day safety buffer -- closest facility able "
        f"to cover the {shortfall_qty}-unit shortfall."
    )
    return best
