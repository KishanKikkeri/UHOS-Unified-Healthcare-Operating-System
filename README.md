<div align="center">

# UHOS — Unified Healthcare Operating System

**An AI-powered, multilingual, event-driven healthcare operations platform for Primary Health Centres (PHCs), Community Health Centres (CHCs), and District Hospitals.**

![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-2.0-CC2927)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![WebSockets](https://img.shields.io/badge/Realtime-WebSockets-4B32C3)
![Multilingual](https://img.shields.io/badge/Languages-EN%20%7C%20HI%20%7C%20KN%20%7C%20GU-D85A30)
![AI](https://img.shields.io/badge/AI-Deterministic%20%26%20Explainable-1D9E75)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

![Backend CI](https://img.shields.io/badge/backend%20CI-not%20configured-lightgrey)
![Frontend CI](https://img.shields.io/badge/frontend%20CI-not%20configured-lightgrey)

</div>

UHOS is a single backend, three lenses. A doctor prescribing medicine, a
citizen checking on a referral, and a district administrator watching bed
occupancy are all looking at the same append-only event stream — not
three disconnected systems that happen to sync eventually. Every
domain action (a prescription, a dispensing decision, a referral, a bed
reservation) is recorded once, and the dashboard, the doctor workspace,
and the citizen app all update from that single source of truth in
real time.

---

## 📸 Project Banner

> Screenshots below are placeholders — capture these from a running
> instance (`npm run dev` + `uvicorn app.main:app --reload`) before
> publishing.

| District Dashboard | Doctor Workspace |
|---|---|
| ![District Dashboard](docs/screenshots/dashboard.png) | ![Doctor Workspace](docs/screenshots/doctor-workspace.png) |

| Citizen App | Live Event Timeline |
|---|---|
| ![Citizen App](docs/screenshots/citizen-app.png) | ![Live Event Timeline](docs/screenshots/event-timeline.png) |

---

## 🩺 The Problem

Primary and community health centres in a typical district run on
fragmented tools: a paper register for attendance, a separate stock
ledger, a phone call to check if another facility has a free bed. Medicine
shortages are discovered when the shelf is already empty, not three days
before. Referrals to a higher-level facility happen by guesswork —
whichever hospital the doctor happens to know has capacity today — rather
than by checking actual service availability and bed occupancy.

This fragmentation compounds at the district level. An administrator
trying to answer "which facility needs help right now" has to manually
cross-reference stock levels, doctor attendance, patient footfall, and
bed occupancy across every facility, usually after the fact. There's no
single place where a stock-out, a short-staffed clinic, and a full ward
are visible together, and no record of *why* a redistribution or referral
decision was made once it's done.

UHOS exists to close that gap: one event-driven backend that every view
— doctor, citizen, district admin — reads from and writes to, with every
AI-assisted decision (a redistribution, a facility score, a referral
recommendation) explainable down to the exact numbers behind it.

---

## 💡 Our Solution

UHOS is built around a small number of ideas applied consistently:

- **A single Event Engine.** Every domain action — a prescription, a
  dispense, a doctor attendance change, a bed reservation, a referral —
  writes one row to an append-only `events` table. That table is the
  only thing the Live Event Timeline and the WebSocket broadcast read
  from, so real-time sync across every screen came for free.
- **Pulse AI.** Deterministic, explainable engines for medicine
  forecasting, stock redistribution, facility health scoring, and smart
  referral recommendation — plain formulas over real data, not trained
  models. Every recommendation returns the exact inputs it used.
- **Real-time synchronization.** A WebSocket channel (`/ws/dashboard`)
  tails the event log so the District Dashboard's Live Timeline updates
  the instant something happens anywhere in the system.
- **Explainable AI, always.** Every AI-driven recommendation is logged
  (`ai_decision_logs`) and rendered through a "Why?" drawer in the UI —
  nothing is a black box.
- **Unified healthcare operations.** Doctor attendance, bed management,
  patient footfall, diagnostic test availability, facility services, and
  referrals all live on the same backend and the same event stream, not
  as bolted-on modules.

---

## ✨ Key Features

### District Command Center
- Live facility health scores across every PHC/CHC/District Hospital
- Critical stock alert feed with days-remaining and recommended action
- "Why?" drawer showing the exact numbers behind each alert
- Real-time Live Event Timeline over WebSocket, with an idle-vs-live
  Pulse indicator
- Healthcare Operations cards: Doctor Attendance, Bed Management, Patient
  Footfall, Test Availability, Ward-wise Bed Status, Referral Analytics

### Doctor Workspace
- Doctor and patient pickers
- Multi-item prescription form
- Per-medicine dispensing outcome (dispensed locally / dispensed via
  redistribution / critical shortage) with its own "Why?" drawer
- Smart Referral panel: search a required service, get Pulse AI's
  recommended facility with distance/bed/load reasoning, generate a
  referral, and reserve a bed against it

### Citizen Health App
- Patient search and selection
- Dashboard, Prescriptions, History, and Reports tabs
- **My Referrals** tab: referral destination, service, status, distance,
  appointment context, and assigned bed once reserved
- Fully multilingual UI (English, Hindi, Kannada, Gujarati)

### Healthcare Operations
- **Doctor Attendance** — daily present/absent tracking per facility
- **Bed Management** — aggregate occupied/available/occupancy % per
  facility, with over-occupancy alerts
- **Patient Footfall** — daily and weekly patient counts with a simple
  next-day estimate
- **Test Availability** — per-facility diagnostic test status with
  alternate-facility suggestions when a test goes unavailable
- **Facility Services Directory** — per-facility catalog of services
  offered (OPD, X-Ray, MRI, ICU, etc.), searchable district-wide
- **Smart Referral Engine** — deterministic best-facility recommendation
  for a required service, based on distance, service availability, bed
  availability, and current facility load
- **Ward-wise Bed Status** — individually addressable beds by ward
  (not just a facility-level percentage), with reserve/release/transfer
- **Referral Analytics** — today's referral counts by outcome and the
  top requested service
- **Citizen Referral Tracking** — a patient-facing view of every
  referral made on their behalf

---

## 🧠 Pulse AI

All Pulse AI engines are **deterministic and transparent** — plain,
inspectable formulas over real data, with every input and output logged.
There is no trained model and no black box anywhere in this platform.

| Engine | What it computes | How it's explainable |
|---|---|---|
| **Medicine Forecasting** | `days_remaining = current_stock / avg_daily_consumption(last 7 days)` | The formula is the entire explanation — recomputable by hand from the same numbers shown in the "Why?" drawer |
| **Resource Redistribution** | Which nearby facility has surplus stock of a scarce medicine, and how much to transfer | Returns the exact source facility, surplus quantity, and distance considered |
| **Facility Health Scoring** | A composite score per facility from medicine availability and doctor attendance | Score, medicine sub-score, and doctor sub-score are all returned individually |
| **Smart Referral Recommendation** | Best destination facility for a required service, weighing distance → bed availability → facility load | Returns the recommended facility, distance, available beds, current load %, and a plain-language reason string |
| **Explainability Engine** | Wraps every recommendation above in a fixed `status` / `recommendation` / `explanation` shape | The same shape powers every "Why?" drawer in the UI, and every decision is persisted to `ai_decision_logs` for audit |

---

## ⚡ Event-Driven Architecture

Everything in UHOS revolves around healthcare events. A single append-only
`events` table is written to by every domain action, and is the only
thing the real-time layer (WebSocket) and the Live Timeline read from.

```
Patient Visit
     │
     ▼
Doctor Consultation
     │
     ▼
Prescription
     │
     ▼
Medicine Verification (Pulse AI stock check)
     │
     ▼
Dispensing (local / redistribution / critical shortage)
     │
     ▼
Referral (if a higher level of care is required)
     │
     ▼
Bed Reservation
     │
     ▼
Citizen Record Update
     │
     ▼
District Dashboard Update
     │
     ▼
Pulse AI Recommendation (logged + explainable)
     │
     ▼
Live Event Timeline
```

---

## 🗺️ Architecture Diagram

| Diagram | Location |
|---|---|
| System Architecture | ![Architecture Diagram](docs/diagrams/architecture.png) |
| ER Diagram | ![ER Diagram](docs/diagrams/er_diagram.png) |
| Event Flow | ![Event Flow Diagram](docs/diagrams/event_flow.png) |
| Pulse AI Decision Flow | ![Pulse AI Decision Flow](docs/diagrams/pulse_ai_decision_flow.png) |
| System Workflow | ![System Workflow](docs/diagrams/system_workflow.png) |

Design rationale behind each major architectural call is documented as a
set of ADRs in
[`docs/architecture/ARCHITECTURE_DECISIONS.md`](docs/architecture/ARCHITECTURE_DECISIONS.md).

---

## 🧰 Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS, custom design tokens (`tailwind.config.ts`) |
| **Backend** | FastAPI (Python 3.11) |
| **ORM** | SQLAlchemy 2.0 |
| **Database** | SQLite (local/demo default) or PostgreSQL 16 (production, via `DATABASE_URL`) |
| **Realtime** | Native WebSockets (`/ws/dashboard`), no external pub/sub broker |
| **Testing** | pytest (backend), Vitest + React Testing Library (frontend) |
| **AI** | Deterministic Pulse AI engines — forecasting, redistribution, facility scoring, smart referral |
| **Languages (i18n)** | English, Hindi, Kannada, Gujarati — lightweight custom `LanguageContext` + JSON dictionaries |

---

## 📁 Repository Structure

```
UHOS-Unified-Healthcare-Operating-System/
├── backend/
│   ├── app/
│   │   ├── api/            # FastAPI routers (dashboard, prescriptions, patients,
│   │   │                    #   operations, referral, websocket)
│   │   ├── models/          # SQLAlchemy models
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Pulse AI + event engine + domain logic
│   │   └── db/              # session/engine setup
│   ├── seed/                # seed_data.py, demo_seed.py
│   ├── tests/                # pytest suite
│   ├── backend.Dockerfile
│   ├── backend.env.example
│   └── README.md             # backend-specific API walkthrough
├── frontend/
│   ├── app/                  # Next.js App Router pages (/, /doctor, /citizen)
│   ├── components/           # dashboard, doctor, citizen, operations UI
│   ├── lib/                  # api client, types, websocket client, i18n
│   ├── messages/              # en / hi / kn / gu translation dictionaries
│   ├── tests/                 # Vitest + Testing Library suite
│   ├── frontend.Dockerfile
│   └── frontend.env.example
├── docs/
│   ├── architecture/
│   │   ├── ARCHITECTURE_DECISIONS.md
│   │   └── DEPLOYMENT.md
│   ├── diagrams/               # architecture, ER, event flow, Pulse AI, workflow
│   └── presentation/
│       ├── DEMO_SCRIPT.md
│       └── JUDGE_QA.md
├── PHASE_REFERRAL_HANDOVER.md   # Smart Referral & Advanced Bed Management notes
├── docker-compose.yml           # one-command local stack (Postgres + backend + frontend)
└── README.md
```

---

## 🛠️ Installation

### Backend

```bash
cd backend
pip install -r requirements.txt --break-system-packages   # or use a venv
cp backend.env.example .env
```

### Frontend

```bash
cd frontend
npm install
cp frontend.env.example .env.local
```

### Environment Variables

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | `backend/.env` | `sqlite:///./uhos.db` | Set to a `postgresql://...` URL for a real deployment |
| `PORT` | `backend/.env` | `8000` | Backend port (usually injected by the host) |
| `ALLOWED_ORIGINS` | `backend/.env` | — | Comma-separated frontend origins for CORS |
| `NEXT_PUBLIC_API_BASE_URL` | `frontend/.env.local` | `http://localhost:8000` | Where the frontend sends API/WebSocket traffic |

### Database Setup

No manual setup needed for local development — SQLite is created
automatically on first run. For PostgreSQL, set `DATABASE_URL` to a
`postgresql://user:pass@host/db` connection string; SQLAlchemy handles
the rest with no code changes.

### Demo Seed

```bash
cd backend
python -m seed.demo_seed
```

This resets the database, reseeds a full demo dataset (facilities,
doctors, patients, medicines, attendance, beds, test availability,
facility services, and ward-level bed units), and prints a cheat sheet
of the exact IDs/numbers used.

---

## ▶️ Running UHOS

```bash
# Backend — http://localhost:8000 (interactive docs at /docs)
cd backend
uvicorn app.main:app --reload

# Frontend — http://localhost:3000
cd frontend
npm run dev

# Demo seed (run once against a fresh database)
cd backend
python -m seed.demo_seed
```

`http://localhost:3000` now opens the public landing page; sign in at
`/login` with any account from **[PHASE11_AUTH_HANDOVER.md](PHASE11_AUTH_HANDOVER.md)**'s
demo account table to reach the District Command Center or another role's
workspace.

### Or with Docker Compose (Postgres included)

```bash
docker compose up --build
docker compose exec backend python -m seed.demo_seed   # first run only
```

---

## ✅ Testing

```bash
# Backend test suite
cd backend && python -m pytest tests/ -q

# Frontend test suite
cd frontend && npx vitest run

# Frontend production build (also runs the TypeScript type check)
cd frontend && npm run build
```

Both suites are smoke-test style: every route, service, and UI flow that
ships is covered by at least one test, run before every change is
considered complete.

---

## 🔄 Project Workflow

| Actor | What they do |
|---|---|
| **Doctor** | Logs in via the Doctor Workspace, prescribes medicine, reviews the AI-recommended dispensing outcome, searches for a referral facility, generates a referral, and reserves a bed |
| **Citizen** | Opens the Citizen App, views their prescriptions, medical history, and referral status (including which facility, distance, and bed) |
| **District Administrator** | Watches the District Dashboard — facility scores, open stock alerts, doctor attendance, bed occupancy, patient footfall, test availability, ward status, and referral analytics, all live |
| **Pulse AI** | Computes forecasts, redistribution recommendations, facility scores, and referral recommendations — every output logged and explainable |
| **Event Engine** | Records every one of the above as an event, which drives the Live Timeline and the real-time WebSocket broadcast to every open dashboard |

---

## 📊 Feature Matrix

| Capability | Doctor | Citizen | District Admin | Facility Admin | Pulse AI |
|---|:---:|:---:|:---:|:---:|:---:|
| Prescribe medicine | ✅ | — | — | — | Recommends dispense/redistribute/shortage |
| View dispensing outcome + reasoning | ✅ | ✅ (history) | ✅ | ✅ | Provides the explanation |
| View facility health scores | — | — | ✅ | ✅ | Computes the score |
| Doctor attendance tracking | ✅ (marks) | — | ✅ (views) | ✅ | — |
| Bed management (aggregate) | — | — | ✅ | ✅ | Flags over-occupancy |
| Ward-wise bed status | ✅ (reserves) | — | ✅ | ✅ | — |
| Patient footfall | — | — | ✅ | ✅ | Estimates next-day count |
| Test availability | ✅ | ✅ (indirect) | ✅ | ✅ | Suggests alternate facility |
| Facility services directory | ✅ (searches) | — | ✅ | ✅ (manages) | — |
| Smart referral recommendation | ✅ (requests) | — | ✅ (views analytics) | — | Computes recommendation |
| Referral tracking | ✅ (creates) | ✅ (views own) | ✅ (analytics) | — | — |
| Live event timeline | — | — | ✅ | ✅ | Emits every event |
| Multilingual UI | ✅ | ✅ | ✅ | ✅ | — |

---

## 🌟 Why UHOS?

- **Single Source of Truth** — every view reads from the same
  append-only event log, so doctor, citizen, and admin views can never
  disagree with each other.
- **Real-time Synchronization** — a WebSocket tails the event log; no
  polling hacks, no stale dashboards.
- **Explainable AI** — every Pulse AI recommendation is a plain formula
  over real data, logged and rendered through a "Why?" drawer. Nothing
  is a black box.
- **Multilingual by default** — English, Hindi, Kannada, and Gujarati,
  via a lightweight i18n layer rather than a heavy framework.
- **Event-Driven** — new capabilities (like the Smart Referral Engine)
  plug into the same event stream instead of requiring a parallel
  synchronization mechanism.
- **Healthcare Workflow Automation** — attendance, bed occupancy,
  footfall, test availability, and referrals are tracked automatically
  as part of the same flow doctors and citizens already use.
- **Resource Optimization** — redistribution and referral recommendations
  actively point stock and patients toward where capacity actually exists.
- **Transparent Decision Making** — every AI decision is persisted with
  its exact inputs and outputs for audit, not just its final answer.

---

## 🚧 Future Roadmap

- **ABDM integration** — align patient and facility records with the
  Ayushman Bharat Digital Mission framework
- **Offline synchronization** — allow facility-level operation during
  connectivity gaps, syncing once reconnected
- **Predictive ML forecasting** — a trained model as an optional layer
  alongside (not replacing) the current deterministic forecasting engine
- **Mobile application** — a dedicated mobile client for citizens and
  field doctors
- **Role-based authentication** — proper login and authorization across
  Doctor, Citizen, District Admin, and Facility Admin roles

---

## 📚 Documentation

| Topic | Location |
|---|---|
| Architecture decisions (ADRs) | [`docs/architecture/ARCHITECTURE_DECISIONS.md`](docs/architecture/ARCHITECTURE_DECISIONS.md) |
| Deployment guide | [`docs/architecture/DEPLOYMENT.md`](docs/architecture/DEPLOYMENT.md) |
| Demo script | [`docs/presentation/DEMO_SCRIPT.md`](docs/presentation/DEMO_SCRIPT.md) |
| Judge Q&A | [`docs/presentation/JUDGE_QA.md`](docs/presentation/JUDGE_QA.md) |
| Backend API walkthrough | [`backend/README.md`](backend/README.md) |
| Smart Referral & Bed Management notes | [`PHASE_REFERRAL_HANDOVER.md`](PHASE_REFERRAL_HANDOVER.md) |
| Backend tests | `backend/tests/` |
| Frontend tests | `frontend/tests/` |

---