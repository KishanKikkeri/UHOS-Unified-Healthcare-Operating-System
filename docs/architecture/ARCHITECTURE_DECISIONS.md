# Architecture Decisions

## Decision #001 — No trained ML models
**Reason:** Need explainability during judging.
**Tradeoff:** Lower forecasting sophistication than a real time-series model.
**Benefit:** Every recommendation can be recomputed by hand from raw numbers on the spot. `days_remaining = current_stock / avg_daily_consumption(last 7 days)` is impossible to challenge because there's nothing hidden in it.

## Decision #002 — Single append-only event log + one Postgres/SQLite database
**Reason:** Simplifies synchronization across doctor, patient, and admin views.
**Benefit:** One source of truth. `dispensing_events` is the linchpin table — patient history, PHC stock level, and district consumption trend all derive from it, so there's no risk of the three views disagreeing.

## Decision #003 — Derived tables are recomputed, never edited
**Reason:** Prevents inconsistent state.
**Applies to:** `facility_scores`, `stock_alerts`. These are only ever written by Pulse AI services (`event_engine.py`), triggered after a real event — never touched directly by API handlers.

## Decision #004 — SQLite by default instead of full Alembic-managed Postgres for the hackathon build
**Reason:** Solo build, one week. Full migration tooling adds real engineering rigor but zero demo-visible value, and is a common place to lose hours to environment config instead of features.
**Tradeoff:** Not production-grade migration history.
**Benefit:** Runs anywhere with zero setup — `python -m seed.seed_data` and `uvicorn app.main:app` is the entire deployment story for demo day. Swapping to Postgres later is a one-line env var change (`DATABASE_URL`) since SQLAlchemy abstracts the rest.

## Decision #005 — Three hero flows share one backend, not three separate builds
**Reason:** Solo developer, one week.
**Flows:** Smart Prescription & Stock Intelligence, Patient Journey, District AI Command Center.
**Benefit:** They're different UI lenses on the same event stream (`dispensing_events`, `stock_alerts`, `facility_scores`), not three independent codebases — this is what makes the full vision achievable alone.

## Decision #006 — Lab reports, billing, X-rays, vaccination records deferred to roadmap
**Reason:** Zero additional AI story value; pure CRUD that would consume days without strengthening the three hero flows.
**Where they live instead:** Pitch deck "vision" slide + `Roadmap.md`, framed explicitly as deliberate scope decisions rather than unfinished work.

## Decision #007 — Atomic conditional UPDATE for stock decrements, not check-then-write
**Reason:** Two simultaneous prescriptions must never be able to both pass a Python-level "if stock >= qty" check and drive inventory negative.
**Implementation:** A single `UPDATE inventory SET stock_qty = stock_qty - qty WHERE stock_qty >= qty` — the database itself rejects the decrement if stock is insufficient at the moment the statement runs, regardless of what any earlier read saw.
**Verified:** two concurrent prescriptions for the same medicine at the same facility, combined demand exceeding stock — final inventory was exactly 0, never negative, and the shortfall correctly rolled over to redistribution.
**Known limitation:** SQLite serializes writes at the file level, so this is correctness-safe but not throughput-optimized under heavy concurrent load. A Postgres deployment would use the same atomic-UPDATE pattern with row-level locking for better concurrency — no code change needed beyond the `DATABASE_URL`.

## Decision #008 — AI decisions are logged, not just computed
**Reason:** "Can you audit AI decisions?" needs to be answerable with "yes," not "we could rerun it."
**Implementation:** `ai_decision_logs` table records every forecast and redistribution computation with its exact input and output JSON, timestamped. Independent of `stock_alerts` (which only holds current state) — this is the full history.

## Decision #009 — Explainability object has a fixed shape: `status` / `recommendation` / `explanation`
**Reason:** A frontend "Why?" button needs one consistent structure to render regardless of outcome type (dispensed locally, redistributed, or critical shortage) — no per-case special handling in the UI.

