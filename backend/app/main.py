from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine
from app.api import routes_prescriptions, routes_dashboard, routes_patients, routes_ws, routes_operations, routes_referral, routes_auth
# Phase 11: import the User model so Base.metadata.create_all below picks
# up the new `users` table too -- models.py's models are already
# registered on Base via their own module import chain.
from app.models import user as _user_model  # noqa: F401

# ADR-004: create_all instead of Alembic migrations for the hackathon build.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="UHOS - Unified AI Healthcare Operating System",
    description="Pulse AI backend: explainable stock forecasting, redistribution, and facility scoring.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(routes_prescriptions.router)
app.include_router(routes_dashboard.router)
app.include_router(routes_patients.router)
app.include_router(routes_ws.router)
app.include_router(routes_operations.router)
app.include_router(routes_referral.router)
app.include_router(routes_auth.router)


@app.get("/")
def root():
    return {"status": "UHOS backend running", "docs": "/docs"}


@app.get("/health")
def health():
    """
    Phase 6 addition: minimal liveness/readiness probe for smoke testing
    and deployment health checks. Confirms the process is up and the DB
    engine can open a connection -- no business logic.
    """
    from sqlalchemy import text
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        db_ok = False
    return {"status": "ok" if db_ok else "degraded", "database": "connected" if db_ok else "unreachable"}

