from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import Base, engine
from app.api import routes_prescriptions, routes_dashboard, routes_patients, routes_ws

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


@app.get("/")
def root():
    return {"status": "UHOS backend running", "docs": "/docs"}
