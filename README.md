# UHOS — Unified Healthcare Operating System

![Backend](https://img.shields.io/badge/backend-FastAPI-1D9E75)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2015-2C2C2A)
![Tests](https://img.shields.io/badge/tests-61%20passing-1D9E75)
![Languages](https://img.shields.io/badge/languages-EN%20%7C%20HI%20%7C%20KN%20%7C%20GU-D85A30)

AI-powered, event-driven operations platform for PHCs/CHCs, built around
one idea: every stock, staffing, and capacity decision should be made
automatically where possible, and explained in plain language when a
human needs to check it.

```
Phase 1  ✅ Backend
Phase 2  ✅ District Dashboard
Phase 3  ✅ Doctor Workspace
Phase 4  ✅ Citizen App
Phase 5  ✅ Healthcare Operations (attendance, beds, footfall, tests)
Phase 6  ✅ Multilingual (EN/HI/KN/GU) + full smoke test suite
Phase 7  ✅ Demo polish
Phase 8  ✅ Deployment prep — see docs/architecture/DEPLOYMENT.md
Phase 9  🔄 Presentation & judge prep — see docs/presentation/, docs/diagrams/
```

## Features

| Module | What it does |
|---|---|
| District dashboard | Live command center — facility scores, critical alerts, real-time event timeline over WebSocket |
| Doctor workspace | Prescribing flow with an AI-recommended dispensing outcome and a "Why?" drawer showing the exact reasoning |
| Citizen app | Doctor availability and facility info, fully multilingual (EN/HI/KN/GU) |
| Pulse AI | Explainable forecasting, redistribution, and facility scoring — plain formulas, no black box |
| Healthcare operations | Doctor attendance, bed occupancy, patient footfall, diagnostic test availability |
| Event engine | Single append-only event log powering the live timeline and the full audit trail |

## Architecture

![UHOS architecture](docs/diagrams/architecture.png)

More diagrams — ER schema, event flow, Pulse AI decision flow, system
workflow — are in [`docs/diagrams/`](docs/diagrams/). Design rationale
for each major decision is in
[`docs/architecture/ARCHITECTURE_DECISIONS.md`](docs/architecture/ARCHITECTURE_DECISIONS.md).

## Quick start (local demo)

```bash
# 1. Backend
cd backend
pip install -r requirements.txt --break-system-packages   # or use a venv
cp backend.env.example .env               # defaults to local SQLite, no edits needed
python -m seed.demo_seed                  # reset + reseed + prints a demo cheat sheet
uvicorn app.main:app --reload             # http://localhost:8000, docs at /docs

# 2. Frontend (separate terminal)
cd frontend
cp frontend.env.example .env.local        # already points at localhost:8000
npm install
npm run dev                               # http://localhost:3000
```

Then follow **[docs/presentation/DEMO_SCRIPT.md](docs/presentation/DEMO_SCRIPT.md)**
for the scripted walkthrough (30-second, 2-minute, and full 5-minute
versions), or just click around — Dashboard (`/`), Doctor Workspace
(`/doctor`), Citizen App (`/citizen`).

### Or with Docker Compose (one command, Postgres included)

```bash
docker compose up --build
docker compose exec backend python -m seed.demo_seed   # first run only
```

Open http://localhost:3000. See
[`docs/architecture/DEPLOYMENT.md`](docs/architecture/DEPLOYMENT.md) for
cloud deployment (Railway/Render + Vercel) instructions and a full
verification checklist.

## Running the tests

```bash
cd backend  && python -m pytest tests/ -q     # 40 tests
cd frontend && npm test                       # 21 tests (vitest run)
cd frontend && npm run build                  # production build + type check
```

## Architecture at a glance

- **Backend:** FastAPI + SQLAlchemy. SQLite by default (zero setup);
  set `DATABASE_URL` to a `postgresql://` URL for a real deployment.
  Every domain action (prescription, dispense, attendance change, bed
  update, test-availability change) writes an immutable row to an
  `events` table — that's what powers both the Live Event Timeline and
  the append-only audit trail, and it's why WebSocket support was
  "free": the socket just tails that table.
- **Pulse AI:** forecasting + redistribution + facility scoring are
  plain, explainable formulas over real inventory/consumption data —
  every recommendation returns the exact numbers it used, which is what
  the "Why?" drawers render. No ML model, no black box, by design. See
  `docs/architecture/ARCHITECTURE_DECISIONS.md` (ADR #001) for the
  reasoning.
- **Frontend:** Next.js 15 (App Router) + Tailwind. A lightweight custom
  i18n layer (`lib/i18n/LanguageContext.tsx`, JSON dictionaries in
  `messages/`) rather than a heavier i18n framework.

## Environment variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | `backend/backend.env.example` | `sqlite:///./uhos.db` | Set to `postgresql://user:pass@host/db` for a real deployment target |
| `PORT` | `backend/backend.env.example` | `8000` | Usually injected automatically by Railway/Render — set manually only for local runs |
| `ALLOWED_ORIGINS` | `backend/backend.env.example` | — | Comma-separated frontend origins; tighten before a real deployment (see Known gaps) |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend/frontend.env.example` | `http://localhost:8000` | Where the frontend sends its API/WebSocket traffic |

## Deployment

Full instructions — Docker Compose for local, Railway/Render + Vercel
for a live demo URL — are in
**[docs/architecture/DEPLOYMENT.md](docs/architecture/DEPLOYMENT.md)**.
Quick checklist:

- [ ] `DATABASE_URL` set to the production Postgres instance; run
      `python -m seed.demo_seed` once against it for the demo dataset,
      or your own real data otherwise.
- [ ] `NEXT_PUBLIC_API_BASE_URL` in the deployed frontend's env points
      at the deployed backend's public URL (not `localhost`).
- [ ] CORS: `backend/app/main.py` currently allows `allow_origins=["*"]`
      for local development. Before a public deployment, restrict this
      to the actual frontend origin(s) — `ALLOWED_ORIGINS` in
      `backend.env.example` is provided for this but not yet wired into
      `main.py`.
- [ ] WebSocket path (`/ws/dashboard`) is reachable through whatever
      reverse proxy / load balancer sits in front of the backend.
- [ ] `GET /health` returns `{"status": "ok"}` from the deployed URL.
- [ ] `npm run build` succeeds against the deployed API URL.

## Demo

- **Script:** [docs/presentation/DEMO_SCRIPT.md](docs/presentation/DEMO_SCRIPT.md)
  — 30-second, 2-minute, and full 5-minute versions.
- **Video:** _link to be added once recorded_
- **Judge Q&A:** _[to add — see "Known gaps" below]_

## Repository layout

```
UHOS-Unified-Healthcare-Operating-System/
├── backend/
│   ├── app/                    # FastAPI app: routes, models, services, schemas
│   ├── seed/                   # seed_data.py (data), demo_seed.py (reset + cheat sheet)
│   ├── tests/                  # pytest suite (40 tests)
│   ├── backend.Dockerfile
│   ├── backend.env.example
│   └── README.md               # backend-specific API walkthrough
├── frontend/
│   ├── app/                    # Next.js App Router pages
│   ├── components/             # UI components (dashboard, doctor, citizen, operations)
│   ├── lib/i18n/                # LanguageContext + messages/*.json
│   ├── tests/                  # Vitest + Testing Library suite (21 tests)
│   ├── frontend.Dockerfile
│   └── frontend.env.example
├── docs/
│   ├── architecture/
│   │   ├── ARCHITECTURE_DECISIONS.md   # ADRs — the "why" behind each major call
│   │   └── DEPLOYMENT.md               # full deployment guide + verification checklist
│   ├── diagrams/                       # architecture, ER, event flow, Pulse AI, system workflow
│   └── presentation/
│       └── DEMO_SCRIPT.md              # 30s / 2min / 5min scripted walkthroughs
├── docker-compose.yml           # one-command local stack (Postgres + backend + frontend)
└── README.md                    # this file
```

## Known gaps (intentionally not blocking, but worth fixing before judging)

- **`PHASE6_HANDOVER.md` is referenced but missing.** The root README
  and `docs/architecture/DEPLOYMENT.md` both link to it (multilingual
  coverage details, per-test-file breakdown), but the file isn't in the
  repo. Either restore it from wherever it was originally written, or
  remove the dangling references — right now they're dead links.
- **No `LICENSE` file.** Add one if the project is meant to be publicly
  reusable, even a permissive one — judges and any future contributor
  will look for it.
- **`ALLOWED_ORIGINS` is documented but not wired up.** `backend.env.example`
  defines it, but `backend/app/main.py` still hardcodes
  `allow_origins=["*"]`. Either read the env var in `main.py`'s
  `CORSMiddleware` config, or drop the variable from the example file
  until it's actually used.
- Deep sub-components (`AlertCard`, the four operations cards, doctor
  outcome cards, citizen tab bodies) still render English-only text.
  Every screen judges actually navigate through — nav, dashboard
  headers, the Doctor Workspace flow, the Citizen App shell, the Why
  drawers — is fully translated.
- Screenshots/GIFs for this README aren't included yet — they need to
  be captured from a running instance. Suggested shot list: Dashboard
  with an open alert, the three Doctor Workspace outcomes, the Why
  drawer open, and one language switch before/after.
- No Judge Q&A document is committed yet — worth adding under
  `docs/presentation/` alongside the demo script.