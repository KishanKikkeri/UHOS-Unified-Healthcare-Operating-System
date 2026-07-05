# UHOS Backend — Pulse AI

## Run it

```bash
pip install -r requirements.txt --break-system-packages   # or use a venv
python -m seed.seed_data     # populates 3 facilities, doctors, medicines, patients, 7 days of history
uvicorn app.main:app --reload
```

Then open http://localhost:8000/docs for interactive API docs.

## Try the hero flow

```bash
curl -X POST http://localhost:8000/prescriptions \
  -H "Content-Type: application/json" \
  -d '{"patient_id": 1, "doctor_id": 1, "items": [{"medicine_id": 1, "quantity": 30}]}'
```

Prescribe a small quantity → dispensed locally.
Prescribe a large quantity (e.g. 300 Paracetamol) → triggers redistribution from PHC Bogadi.
Prescribe an enormous quantity of a scarce medicine (e.g. 5000 Amoxicillin) → `critical_shortage`, emergency procurement recommendation.

Every response item has the same fixed shape for the frontend's "Why?" button:
```json
{
  "status": "dispensed_via_redistribution",
  "recommendation": {"action": "transfer", "source_facility": "PHC Bogadi", "transfer_quantity": 190.0},
  "explanation": {
    "current_stock": 110.0, "avg_daily_consumption": 15.57, "days_remaining": 7.1,
    "safety_threshold": 5, "reason": "Stock expected to exhaust before safety threshold.",
    "selected_source": "Nearest facility with surplus after retaining its own safety buffer.",
    "distance_km": 9.4
  }
}
```

## Validation & edge cases (Sprint 1.5 — verified live, not just written)

| Case | Behavior |
|---|---|
| Sufficient stock | Dispensed locally |
| Insufficient stock, surplus exists elsewhere | Redistributed from nearest facility with a safety buffer intact |
| Insufficient stock everywhere | `critical_shortage` + emergency procurement recommendation |
| Unknown medicine | 404 |
| Inactive/absent doctor | 400 |
| Unknown patient | 404 |
| Quantity ≤ 0 | 422 (Pydantic validation) |
| Two concurrent prescriptions racing the same stock | Atomic conditional `UPDATE` — verified final stock never went negative |

Every AI recommendation (forecast + redistribution) is also logged to `ai_decision_logs` with its exact input/output, for audit.

## Key endpoints

| Endpoint | Purpose |
|---|---|
| `POST /prescriptions` | Hero Flow 1 — prescribe, verify stock, dispense/redistribute |
| `GET /district/alerts` | Hero Flow 3 — District Command Center feed, sorted by urgency |
| `GET /phcs/{id}/score` | Facility health score with breakdown |
| `GET /phcs/{id}/alerts` | Open alerts for one facility |
| `GET /doctors/availability?specialization=X` | Hero Flow 2 — doctor search for booking |
| `POST /appointments` | Book an appointment |
| `GET /patients/{id}/history` | Unified patient record (Rx + dispensing + appointments) |

## Seed data notes

Paracetamol at PHC Nanjangud Road (id=1) is deliberately consumed at a fast historical rate so a live "critical stock" alert with a real redistribution recommendation appears from the moment you seed the database — no need to manually create days of history live during the demo.
