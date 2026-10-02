import io
import uuid
import jwt
from datetime import datetime, timezone, timedelta
from config import settings
from conftest import create_jwt_token

def test_system_health_and_readiness(client):
    res_health = client.get("/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "healthy"

    res_ready = client.get("/ready")
    assert res_ready.status_code == 200
    assert res_ready.json()["model_loaded"] is True
    assert res_ready.json()["ready"] is True

def test_unauthenticated_request_rejected(client):
    res = client.get("/v1/me")
    assert res.status_code == 401
    assert "Authorization header" in res.json()["detail"]["message"]

def test_expired_token_rejected(client):
    expired_token = create_jwt_token(str(uuid.uuid4()), "expired@example.com", expires_in_seconds=-60)
    res = client.get("/v1/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "TOKEN_EXPIRED" in str(res.json())

def test_tampered_token_rejected(client):
    valid_token = create_jwt_token(str(uuid.uuid4()), "valid@example.com")
    tampered_token = valid_token[:-4] + "fake"
    res = client.get("/v1/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert res.status_code == 401

def test_user_profile_isolation(client, user_a, user_b):
    # User A updates profile
    res_a = client.put(
        "/v1/me",
        headers=user_a["headers"],
        json={"name": "Aarav Sharma", "age": 28, "locale": "en", "goals": ["Better Sleep"]}
    )
    assert res_a.status_code == 200
    assert res_a.json()["name"] == "Aarav Sharma"
    assert res_a.json()["user_id"] == user_a["user_id"]

    # User B fetches profile (should NOT see User A's data)
    res_b = client.get("/v1/me", headers=user_b["headers"])
    assert res_b.status_code == 200
    assert res_b.json()["user_id"] == user_b["user_id"]
    assert res_b.json()["name"] != "Aarav Sharma"

def test_two_account_report_isolation(client, user_a, user_b):
    # User A uploads a report
    fake_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = client.post(
        "/v1/reports",
        headers=user_a["headers"],
        files={"file": ("usera_report.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    )
    assert upload_res.status_code == 200
    report_id = upload_res.json()["report_id"]

    # User A can access their own report
    get_a = client.get(f"/v1/reports/{report_id}", headers=user_a["headers"])
    assert get_a.status_code == 200
    assert get_a.json()["id"] == report_id

    # User B CANNOT access User A's report (must return 404 Not Found / Unauthorized)
    get_b = client.get(f"/v1/reports/{report_id}", headers=user_b["headers"])
    assert get_b.status_code == 404

    # User B CANNOT download User A's report
    download_b = client.get(f"/v1/reports/{report_id}/download", headers=user_b["headers"])
    assert download_b.status_code == 404

    # User B CANNOT modify observations on User A's report
    patch_b = client.patch(
        f"/v1/reports/{report_id}/observations",
        headers=user_b["headers"],
        json={"observations": [{"id": str(uuid.uuid4()), "status": "confirmed"}]}
    )
    assert patch_b.status_code == 404
