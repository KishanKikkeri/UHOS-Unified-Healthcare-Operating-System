"""
Patient Footfall Engine (Phase 5, Module 3).

Per the handover doc: no new system, no ML -- reuse existing Appointment
data and the same deterministic "average over a lookback window" approach
already used by forecast.py.
"""
from datetime import datetime, timedelta
from collections import Counter
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.models import Appointment, PHC

LOOKBACK_DAYS = 7


def _day_bounds(offset_days: int = 0):
    now = datetime.utcnow()
    start = (now - timedelta(days=offset_days)).replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)
    return start, end


def facility_footfall_summary(db: Session, facility_id: Optional[int] = None) -> dict:
    """
    today_count, weekly_total, peak_hour, expected_tomorrow -- all derived
    from Appointment.scheduled_at. facility_id=None aggregates district-wide.
    """
    def base_query():
        q = db.query(Appointment)
        if facility_id is not None:
            q = q.filter(Appointment.phc_id == facility_id)
        return q

    today_start, today_end = _day_bounds(0)
    today_count = (
        base_query()
        .filter(Appointment.scheduled_at >= today_start, Appointment.scheduled_at < today_end)
        .count()
    )

    week_start, _ = _day_bounds(LOOKBACK_DAYS - 1)
    week_rows = (
        base_query()
        .filter(Appointment.scheduled_at >= week_start, Appointment.scheduled_at < today_end)
        .all()
    )
    weekly_total = len(week_rows)

    hour_counts = Counter(a.scheduled_at.hour for a in week_rows)
    if hour_counts:
        peak_hour_val, _ = hour_counts.most_common(1)[0]
        peak_hour = f"{peak_hour_val:02d}:00"
    else:
        peak_hour = None

    # Deterministic forecast: average daily count over the lookback window,
    # same "plain formula, no ML" spirit as forecast.py's avg_daily_consumption.
    days_with_data = max(LOOKBACK_DAYS, 1)
    expected_tomorrow = round(weekly_total / days_with_data, 1)

    return {
        "facility_id": facility_id,
        "today_patients": today_count,
        "weekly_total": weekly_total,
        "peak_hour": peak_hour,
        "expected_tomorrow": expected_tomorrow,
        "calculation": (
            f"expected_tomorrow = {weekly_total} appointments / {days_with_data} days "
            f"= {expected_tomorrow}"
        ),
    }


def district_footfall_summary(db: Session) -> dict:
    facilities = db.query(PHC).all()
    per_facility = [facility_footfall_summary(db, f.id) for f in facilities]
    overall = facility_footfall_summary(db, None)
    overall["facilities"] = per_facility
    return overall
