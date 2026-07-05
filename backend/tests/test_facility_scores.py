"""Facility Score Engine smoke test: weighted formula recomputes correctly."""
from app.services.facility_score import compute_facility_score


def test_score_recomputation(db_session, seeded_db):
    result = compute_facility_score(db_session, seeded_db["phc_a"].id)

    assert set(result.keys()) >= {"medicine_score", "doctor_score", "score", "calculation"}
    # Both medicines start above the 5-day safety threshold (2 units of
    # med_low with a floor consumption rate of 0.01/day is still >= 5 days),
    # and the one doctor is active -> both sub-scores should be 100.
    assert result["medicine_score"] == 100.0
    assert result["doctor_score"] == 100.0
    assert result["score"] == 100.0


def test_score_drops_when_doctor_absent(db_session, seeded_db):
    seeded_db["doc_a"].status = "absent"
    db_session.commit()

    result = compute_facility_score(db_session, seeded_db["phc_a"].id)

    assert result["doctor_score"] == 0.0
    assert result["score"] == round(100.0 * 0.6 + 0.0 * 0.4, 1)
