# UHOS — Judge Q&A

Concise, technically sound answers to the questions judges are most
likely to ask, grounded in what's actually in this repo (see
`ARCHITECTURE_DECISIONS.md` for the full ADR list this draws from).

---

## AI / Pulse AI

**Q: Why rule-based AI instead of a trained ML model?**
Explainability during judging (ADR #001). `days_remaining = current_stock
/ avg_daily_consumption(last 7 days)` can be recomputed by hand from raw
numbers on the spot — nothing hidden, nothing to take on faith.

**Q: Why no ML at all — isn't that less impressive?**
The interesting problem here isn't "can a model predict a number," it's
"can a health worker trust and act on that number." A transparent
formula a judge can verify live is worth more in this domain than a
marginally more accurate model no one can audit in the room.

**Q: Doesn't a formula miss patterns a model would catch (seasonality, outbreaks)?**
Yes — that's an explicit, documented tradeoff (ADR #001), not an
oversight. Seasonal demand forecasting is on the roadmap once there's
enough real historical data to justify a model that's still explainable
(e.g. exposing feature contributions, not just a final score).

**Q: How is "days remaining" actually calculated?**
Current stock divided by average daily consumption over the last 7
days of `dispensing_events`. The threshold that triggers an alert is a
configurable constant compared against that result.

**Q: How does redistribution pick a source facility?**
It looks for the nearest PHC in the district with surplus stock of the
same medicine. The exact facility, quantity, and distance are shown in
the Why drawer — never a black-box transfer.

**Q: What happens if no facility has enough stock anywhere?**
The system says so honestly and recommends emergency procurement
instead of silently over-promising a redistribution that doesn't exist.

**Q: Can an AI decision be audited after the fact?**
Yes — every forecast and redistribution computation is logged to
`ai_decision_logs` with its exact input and output JSON and a timestamp
(ADR #008), independent of the current-state `stock_alerts` table.

**Q: What's the "Why?" drawer actually showing — is it real or decorative?**
It renders the same `explanation` object the backend computed for that
specific decision — current stock, consumption, threshold, and (for
redistribution) source facility and distance. Nothing is reformatted or
summarized for show.

**Q: How is facility score computed?**
A combination of medicine availability and doctor availability into one
number, computed and written only by the Pulse AI service layer, never
by API handlers directly (ADR #003).

**Q: What are the three prescription outcomes and how are they decided?**
`dispensed_locally` (enough stock on hand), `dispensed_via_redistribution`
(nearby surplus found), and `critical_shortage` (no facility has enough
— emergency procurement recommended). All three share one fixed
response shape (`status` / `recommendation` / `explanation`, ADR #009)
so the frontend needs no per-case special handling.

---

## Architecture / engineering

**Q: Why event-driven?**
A single append-only `events` table is what both the Live Event Timeline
and the WebSocket push are built on (ADR #002) — one source of truth
that the dashboard, doctor workspace, and citizen app all derive from,
so the three views can't disagree with each other.

**Q: Why WebSockets, and why only for two UI elements?**
WebSockets power the Live Event Timeline and the Pulse AI status
indicator specifically — everything else (alerts, facility scores)
still polls every 8 seconds. That was a deliberate scope decision: only
add real-time transport where the "it just updated" moment is actually
visible and valuable in a demo, not as a blanket architectural upgrade.

**Q: How does the WebSocket avoid double-writing or race conditions with the Event Engine?**
It's read-only. Each connected client gets its own lightweight
server-side loop that opens a short-lived DB session every ~1 second and
reads the `events` table for anything newer than the last id it sent,
plus a ~2s heartbeat. No broadcast is wired into the Event Engine's
write path, so there's no cross-thread coordination needed between the
sync writer and the async socket loop.

**Q: Why PostgreSQL (and why does the code default to SQLite)?**
SQLite is the local/demo default so the app runs with zero external
setup (ADR #004) — no Postgres server required just to try it. Swapping
to Postgres for a real deployment is a one-line `DATABASE_URL` env var
change since SQLAlchemy abstracts the rest; no code changes.

**Q: How do you prevent two simultaneous prescriptions from over-drawing the same stock?**
A single atomic conditional `UPDATE inventory SET stock_qty = stock_qty
- qty WHERE stock_qty >= qty` (ADR #007) — the database itself rejects
the decrement if stock is insufficient at the moment the statement runs,
regardless of what an earlier read saw. Verified with two concurrent
prescriptions whose combined demand exceeded stock: final inventory was
exactly 0, never negative, and the shortfall correctly routed to
redistribution.

**Q: Is that safe under real concurrent load?**
The atomic-UPDATE pattern is correctness-safe on SQLite but not
throughput-optimized, since SQLite serializes writes at the file level.
A Postgres deployment uses the identical pattern with row-level locking
for better concurrency — no code change beyond `DATABASE_URL`.

**Q: Why no Alembic / formal migrations?**
A deliberate scope decision for a solo, one-week hackathon build (ADR
#004) — migration tooling adds engineering rigor with zero demo-visible
value, and is a common place to lose hours to environment config instead
of features. The app uses `Base.metadata.create_all()`. This is flagged
explicitly as a gap, not something to be discovered by a judge.

**Q: Why does one backend serve three very different frontends?**
The three "hero flows" (District Command Center, Doctor Workspace,
Citizen App) are different UI lenses over the same event stream —
`dispensing_events`, `stock_alerts`, `facility_scores` — not three
independent codebases (ADR #005). That's what made building the full
vision achievable solo in the time available.

**Q: What's deliberately out of scope, and why?**
Lab reports, billing, X-rays, and vaccination records (ADR #006) — pure
CRUD with no additional AI story value, that would have consumed days
without strengthening the three hero flows. These are documented as
scope decisions on the roadmap, not unfinished work.

**Q: How is the codebase tested?**
40 backend pytest cases (routes, WebSocket, redistribution logic,
forecasting, attendance/beds/footfall/test-availability) plus 21
frontend vitest/Testing-Library cases including a full Doctor Workspace
submit flow, plus a smoke test suite. The full suite runs in under 15
seconds.

**Q: What's the tech stack and why those choices?**
FastAPI + SQLAlchemy on the backend (typed, auto-documented via
`/docs`); Next.js 15 + React 19 + TypeScript + Tailwind on the frontend;
native WebSockets rather than a message broker, since a single append-
only table was already the right abstraction and a broker would have
been unjustified infrastructure for this scale.

---

## Scalability / production readiness

**Q: Does this scale beyond a demo dataset?**
The data model and atomic-write pattern are the same ones a production
deployment would use (Postgres + row-level locking); what's genuinely
demo-scoped is the lack of migrations and the permissive CORS policy —
both flagged explicitly in `DEPLOYMENT.md`, not silent gaps.

**Q: What would you change first for a real government deployment?**
In order: (1) Alembic migrations, (2) role-based auth (currently there's
no login system — the doctor/patient picker is a stand-in), (3) CORS
locked to the real frontend origin, (4) an actual message queue only if
usage volume demands it — the event log alone comfortably handles a
district-scale deployment.

**Q: How would this handle multiple districts / a state-wide rollout?**
The schema already scopes everything by `phc_id`/`district`, so
horizontal growth is adding rows, not restructuring tables. The main
work at that scale is operational: connection pooling, and likely
splitting the event-tailing WebSocket load across replicas.

---

## Security / privacy / offline

**Q: What about data privacy for patient records?**
No PII beyond name/DOB is stored in this build; there's no auth layer
yet (see Scalability above), so this is explicitly a demo-stage gap, not
a claim of production-grade compliance. A real deployment would need
patient consent flows and access controls before touching real
patient data — that's on the roadmap, not shipped today.

**Q: Is there offline support for facilities with unreliable connectivity?**
Not in this build — it's on the future-scope list (offline-first mode).
Today's build assumes a working connection, same as the WebSocket
transport requires.

**Q: How is the API secured?**
It isn't, yet — CORS is currently wide open (`allow_origins=["*"]`) for
demo simplicity, documented explicitly in `DEPLOYMENT.md` as the first
thing to tighten before any real deployment.

---

## Cost / government deployment

**Q: What would this cost to run for a real district?**
The stack is intentionally cheap to host — FastAPI + Postgres + Next.js
runs comfortably on a single small Railway/Render instance plus Vercel's
free/hobby tier for the frontend at this scale; the event-log design
avoids needing a separate message broker or cache layer.

**Q: How would a government health department actually adopt this?**
Two integration points would matter most: (1) exporting district-level
summaries in whatever format the state health department already
consumes, and (2) an SMS/IVR fallback for citizens without smartphones
— both on the future-scope list, deliberately not built for the hackathon
given the time available.

**Q: Is this open source / what's the license?**
See the repository's LICENSE file. [Confirm license terms before quoting
this to judges if the field is currently unset.]

---

## Product / scope

**Q: Why these three "hero flows" specifically and not others?**
They map to the three people who actually touch a PHC on a given day —
the doctor prescribing, the district officer monitoring, and the
patient/citizen receiving care — while sharing one backend (ADR #005).

**Q: Why multilingual, and why these four languages?**
EN/HI/KN/GU reflects the linguistic reality of the district the demo
dataset is modeled on (Karnataka) plus Hindi and Gujarati as commonly
needed elsewhere. The nav, dashboard headers, Doctor Workspace flow,
Citizen App shell, and Why drawers are fully translated; some deeper
sub-components remain English-only — see `PHASE6_HANDOVER.md` for the
exact list. This is a documented gap, not something to discover live.

**Q: What's the single most impressive technical decision here?**
Most teams pick one: either "we built an AI feature" or "we built it
well." Decision #007 (atomic conditional UPDATE preventing negative
stock under concurrent prescriptions) is the detail that shows both at
once — it's not a headline AI feature, but it's the kind of correctness
bug that would embarrass a real deployment on day one, and it's handled
at the database level, not papered over in application code.

**Q: What was cut to make the one-week timeline work?**
Lab reports, billing, imaging, and vaccination records (ADR #006) — see
"What's deliberately out of scope" above. Also: formal migrations
(ADR #004) and authentication, both flagged, not hidden.

**Q: Is the demo data real or fabricated?**
Fabricated but structurally realistic — seeded via `seed/demo_seed.py`
with a believable Mysuru-district dataset (facility names, a week of
dispensing history) so that AI recommendations are computed from
actual seeded numbers, not hardcoded outputs.

---

## Roadmap / future scope

**Q: What's next after the hackathon?**
Role-based auth, SMS/IVR citizen fallback, state health department
reporting-format integration, expanded Pulse AI (seasonal demand
forecasting, ambulance routing), and offline-first mode — see the
Future Scope slide in the pitch deck.

**Q: Would you ever add a trained ML model later?**
Possibly, once there's enough real historical data to justify it — but
only in a way that preserves explainability (e.g. exposing feature
contributions alongside a prediction), not as a silent black-box swap
for the current formulas.

---

*This document covers common categories judges ask about. If a
question comes up that isn't here, the honest fallback is always: point
to the specific ADR or test that backs the claim, and say plainly when
something is a documented gap rather than improvising a slicker-sounding
non-answer.*
