# UHOS — Deployment Guide

Two supported paths: **Docker Compose** (local, one command, mirrors
production topology) and **cloud PaaS** (Railway/Render for the backend +
Vercel for the frontend, for a live judge-facing demo URL).

---

## Option A — Docker Compose (local, one command)

Requirements: Docker + Docker Compose.

```bash
docker compose up --build
```

This starts three containers: `db` (Postgres 16), `backend` (FastAPI on
:8000), `frontend` (Next.js on :3000). Wait for `db` to report healthy
(compose handles the ordering), then seed once:

```bash
docker compose exec backend python -m seed.demo_seed
```

Open **http://localhost:3000**. Backend health check: **http://localhost:8000/health**.

To reset demo data, just re-run the seed command — it's idempotent
(drops and recreates demo rows; see `backend/seed/demo_seed.py`).

To stop: `docker compose down` (add `-v` to also drop the Postgres volume).

---

## Option B — Cloud deployment (live demo URL)

### Backend — Railway (or Render / Fly.io)

1. Create a new project, point it at this repo, root directory `backend/`.
2. Railway/Render will detect the `Dockerfile` in `backend/` automatically.
   If asked for a start command instead, use:
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
3. Add a **Postgres** plugin/add-on (Railway: "New" → "Database" →
   "PostgreSQL"; Render: "New" → "PostgreSQL"). Copy the connection string.
4. Set environment variables (see `backend/.env.example`):
   - `DATABASE_URL` = the Postgres connection string from step 3
   - `PORT` is injected automatically by Railway/Render — don't hardcode it
5. Deploy. Confirm:
   - `https://<your-backend>/health` returns `{"status":"ok","database":"connected"}`
   - `https://<your-backend>/docs` loads the FastAPI Swagger UI
6. Seed the production DB once, using the platform's shell/console:
   ```bash
   python -m seed.demo_seed
   ```
7. WebSocket check: the `/ws/dashboard` endpoint runs over the same HTTPS
   host — most PaaS providers (Railway, Render) proxy WebSocket upgrades
   over HTTPS automatically (`wss://`), no extra config needed. Fly.io
   requires no special config either as long as the app listens on `$PORT`.

### Frontend — Vercel

1. Import the repo into Vercel, root directory `frontend/`.
2. Framework preset: Next.js (auto-detected).
3. Set environment variable (see `frontend/.env.example`):
   - `NEXT_PUBLIC_API_BASE_URL` = your deployed backend URL from above
     (e.g. `https://uhos-backend.up.railway.app`)
4. Deploy. Vercel builds with `npm run build` automatically.
5. Confirm in the deployed site:
   - Dashboard loads and the Live Event Timeline connects (check browser
     dev tools → Network → WS for an open `wss://` connection to
     `/ws/dashboard`)
   - Language switch (EN/HI/KN/GU) works
   - `/doctor` and `/citizen` routes load

---

## Deployment verification checklist

Run through this end-to-end before calling it demo-ready:

- [ ] `GET /health` on deployed backend → `{"status": "ok"}`
- [ ] `npm run build` succeeds locally (already verified — see PHASE6_HANDOVER.md)
- [ ] `pytest` passes (40 tests) against a fresh seeded DB
- [ ] WebSocket: open the deployed dashboard, submit a prescription in
      `/doctor`, confirm the Live Event Timeline updates without a page
      refresh
- [ ] Language switch cycles through EN/HI/KN/GU on the deployed frontend
- [ ] `python -m seed.demo_seed` runs cleanly against the deployed
      Postgres instance (demo reset works)
- [ ] Full demo script (`DEMO_SCRIPT.md`) walked start-to-finish using
      only the deployed URLs — no localhost fallback

---

## Notes / things intentionally not done

- **CORS** is currently `allow_origins=["*"]` in `main.py` for demo
  simplicity. Fine for a hackathon judge demo; if this were to go further,
  tighten it to the actual Vercel URL using `ALLOWED_ORIGINS` from
  `.env.example`.
- **Migrations**: the app uses `Base.metadata.create_all()`, not Alembic
  (see ADR-004 in `ARCHITECTURE_DECISIONS.md`) — fine for a hackathon
  build, not a production migration strategy.
- No new architecture, endpoints, or business logic were introduced by
  the Docker/deployment files above — they only wrap the existing app.
