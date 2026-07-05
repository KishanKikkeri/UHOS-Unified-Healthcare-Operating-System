"""Forecast Engine smoke test: days-remaining calculation matches the formula."""
from app.services.forecast import forecast_days_remaining, current_stock


def test_days_remaining_calculation(db_session, seeded_db):
    phc = seeded_db["phc_a"]
    med = seeded_db["med_high"]

    stock = current_stock(db_session, phc.id, med.id)
    assert stock == 500

    # No dispensing history yet -> avg_daily_consumption floors to 0.01
    consumption_rate = 0.01
    breakdown = forecast_days_remaining(db_session, phc.id, med.id, consumption_rate)

    assert breakdown["current_stock"] == 500
    assert breakdown["days_remaining"] == round(500 / 0.01, 1)
    assert breakdown["is_critical"] is False
    assert "calculation" in breakdown
