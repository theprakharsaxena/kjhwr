import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "WindScope" in data["service"]
    assert "timestamp_utc" in data

def test_policies_endpoint():
    response = client.get("/api/policies")
    assert response.status_code == 200
    policies = response.json()
    assert isinstance(policies, list)
    policy_ids = [p["policy_id"] for p in policies]
    assert "d0_0000" in policy_ids
    assert "d1_1100" in policy_ids
    assert "d1_1200" in policy_ids
    assert "d1_1700" in policy_ids

def test_overview_invalid_date():
    # Outside January 2026
    response = client.get("/api/overview?delivery_date=2026-02-05")
    assert response.status_code == 400
    assert "outside the target period" in response.json()["detail"]

def test_timeline_invalid_range():
    # start_date after end_date
    response = client.get("/api/timeline?start_date=2026-01-20&end_date=2026-01-10")
    assert response.status_code == 400
    assert "cannot be after end_date" in response.json()["detail"]

def test_export_csv_headers():
    response = client.get("/api/export.csv?start_date=2026-01-01&end_date=2026-01-01")
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/csv")
    csv_text = response.text
    assert "interval_start_utc" in csv_text
    assert "forecast_generation_mw" in csv_text
    assert "actual_generation_mw" in csv_text
