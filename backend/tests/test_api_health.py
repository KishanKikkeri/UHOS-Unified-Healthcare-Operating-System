"""API health smoke tests: root endpoint, Swagger docs, and DB connectivity."""
from sqlalchemy import text


def test_root_endpoint(client):
    resp = client.get("/")
    assert resp.status_code == 200
    assert resp.json()["status"] == "UHOS backend running"


def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert resp.json()["database"] == "connected"


def test_swagger_docs_available(client):
    resp = client.get("/docs")
    assert resp.status_code == 200

    openapi_resp = client.get("/openapi.json")
    assert openapi_resp.status_code == 200
    assert "paths" in openapi_resp.json()


def test_database_connection(db_session):
    result = db_session.execute(text("SELECT 1")).scalar()
    assert result == 1
