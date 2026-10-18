import base64
import subprocess
import sys
import uuid
import pytest
from config import settings
from storage import DurableMap, transaction, execute
from conftest import synthetic_pdf, create_jwt_token


@pytest.mark.parametrize(
    "path",
    [
        "/api/ai/chat",
        "/api/ai/analyze-meal",
        "/v1/diet/analyze-meal",
        "/api/ai/generate-diet",
        "/api/ai/symptom-triage",
        "/api/reports/analyze",
    ],
)
def test_mobile_ai_requires_authentication(client, path):
    assert client.post(path, json={}).status_code == 401


def test_demo_token_disabled(client):
    assert (
        client.get(
            "/v1/me", headers={"Authorization": "Bearer demo_jwt_token"}
        ).status_code
        == 401
    )


def test_missing_expiry_wrong_issuer_role_rejected(client):
    import jwt

    for change in (
        {"exp": None},
        {"iss": "https://attacker.test/auth/v1"},
        {"role": "service_role"},
    ):
        token = create_jwt_token(str(uuid.uuid4()), "a@example.com")
        claims = jwt.decode(token, options={"verify_signature": False})
        claims.update(change)
        if change.get("exp", 1) is None:
            del claims["exp"]
        altered = jwt.encode(claims, settings.SUPABASE_JWT_SECRET, algorithm="HS256")
        assert (
            client.get(
                "/v1/me", headers={"Authorization": "Bearer " + altered}
            ).status_code
            == 401
        )


def test_persistence_survives_new_process(client, user_a):
    assert (
        client.put(
            "/v1/me", headers=user_a["headers"], json={"name": "Persistent user"}
        ).status_code
        == 200
    )
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            'from storage import DurableMap; import sys; print(DurableMap("profiles")[sys.argv[1]]["name"])',
            user_a["user_id"],
        ],
        cwd="services/api",
        capture_output=True,
        text=True,
        check=True,
    )
    assert result.stdout.strip() == "Persistent user"


def test_report_download_and_deletion_isolation(client, user_a, user_b):
    raw = synthetic_pdf()
    uploaded = client.post(
        "/v1/reports",
        headers=user_a["headers"],
        files={"file": ("test.pdf", raw, "application/pdf")},
    ).json()
    path = "/v1/reports/" + uploaded["report_id"]
    assert client.get(path + "/file", headers=user_a["headers"]).content == raw
    assert client.get(path + "/file", headers=user_b["headers"]).status_code == 404
    assert client.get(path + "/file?token=" + user_a["token"]).status_code == 401
    assert client.delete(path, headers=user_b["headers"]).status_code == 404
    assert client.delete(path, headers=user_a["headers"]).status_code == 200
    assert client.get(path + "/file", headers=user_a["headers"]).status_code == 404


def test_delete_account_removes_health_records_and_revokes_access(client, user_a):
    uid = user_a["user_id"]
    client.get("/v1/me", headers=user_a["headers"])
    client.post(
        "/v1/reminders",
        headers=user_a["headers"],
        json={"label": "Private habit", "user_entered_schedule": "08:00"},
    )
    client.post(
        "/v1/reports",
        headers=user_a["headers"],
        files={"file": ("private.pdf", synthetic_pdf(), "application/pdf")},
    )
    client.post("/v1/chat", headers=user_a["headers"], json={"query": "sleep habits"})
    result = client.delete("/v1/me", headers=user_a["headers"])
    assert result.status_code == 200
    assert client.get("/v1/me", headers=user_a["headers"]).status_code == 401
    assert uid not in DurableMap("profiles")
    assert uid not in DurableMap("conversations")
    assert not list(DurableMap("reports").values()) or all(
        v["user_id"] != uid for v in DurableMap("reports").values()
    )
    assert all(v["user_id"] != uid for v in DurableMap("reminders").values())


def test_chat_ignores_unconfirmed_and_forged_mobile_report_values(client, user_a):
    forged = {
        "title": "Forged",
        "testResults": [{"testName": "glucose", "value": "99999"}],
    }
    result = client.post(
        "/api/ai/chat",
        headers=user_a["headers"],
        json={"query": "glucose", "reports": [forged]},
    ).json()
    assert "99999" not in result["response"]


@pytest.mark.parametrize(
    "payload",
    [
        {"kind": "water", "value": -1, "unit": "ml"},
        {"kind": "sleep", "value": 30, "unit": "hours"},
        {"kind": "activity", "value": 30, "unit": "hours"},
        {"kind": "diagnosis", "value": 1, "unit": "ml"},
    ],
)
def test_invalid_health_logs_rejected(client, user_a, payload):
    result = client.post(
        "/v1/logs",
        headers=user_a["headers"],
        json={**payload, "occurred_at": "2026-10-16T08:00:00Z"},
    )
    assert result.status_code == 422


def test_duplicate_online_entry_is_idempotent(client, user_a):
    payload = {
        "kind": "water",
        "value": 250,
        "unit": "ml",
        "occurred_at": "2026-10-16T08:00:00Z",
        "mutation_id": str(uuid.uuid4()),
    }
    first = client.post("/v1/logs", headers=user_a["headers"], json=payload)
    second = client.post("/v1/logs", headers=user_a["headers"], json=payload)
    assert first.status_code == second.status_code == 200
    assert first.json()["id"] == second.json()["id"]
    payload["value"] = 500
    assert (
        client.post("/v1/logs", headers=user_a["headers"], json=payload).status_code
        == 409
    )


def test_readiness_fails_when_database_unavailable(client, monkeypatch):
    monkeypatch.setattr(
        settings, "DATABASE_URL", "postgresql://invalid:invalid@127.0.0.1:1/missing"
    )
    result = client.get("/ready")
    assert result.status_code == 503
    assert result.json()["database_connected"] is False


def test_rate_limit_is_enforced(client, user_a, monkeypatch):
    with transaction() as conn:
        execute(conn, "DELETE FROM rate_limits")
    monkeypatch.setattr(settings, "RATE_LIMIT_PER_MINUTE", 1)
    assert client.get("/v1/me", headers=user_a["headers"]).status_code == 200
    assert client.get("/v1/me", headers=user_a["headers"]).status_code == 429


def test_malformed_pdf_is_rejected(client, user_a):
    result = client.post(
        "/v1/reports",
        headers=user_a["headers"],
        files={"file": ("bad.pdf", b"%PDF-1.4\ninvalid", "application/pdf")},
    )
    assert result.status_code == 400


def test_parser_label_numbers_specific_aliases_and_comparators():
    from parsers.report_parser import extract_observations_from_text

    obs = extract_observations_from_text(
        [
            (
                1,
                "Patient 42 HbA1c 6.2 % Ref 4.0 - 5.6\nHDL Cholesterol 55 mg/dL Ref > 40\nFasting glucose < 70 mg/dL Ref 70 - 99",
            )
        ]
    )
    assert [(o["canonical_test"], o["numeric_value"]) for o in obs] == [
        ("hba1c", 6.2),
        ("hdl_cholesterol", 55),
        ("fasting_blood_sugar", 70),
    ]
    assert obs[2]["is_outside_stated_interval"] is None


def test_report_unknown_range_stays_unverified(client, user_a, monkeypatch):
    monkeypatch.setattr("services.mobile_ai_service._gemini_json", lambda *args: None)
    result = client.post(
        "/api/reports/analyze",
        headers=user_a["headers"],
        json={"documentText": "Patient laboratory report\nHemoglobin 14.2 g/dL"},
    ).json()
    assert result["report"]["testResults"][0]["status"] == "UNVERIFIED"
    assert result["report"]["chunksIndexed"] == 0


def test_bad_provider_nutrition_rejected(client, user_a, monkeypatch):
    monkeypatch.setattr(
        "services.meal_vision_service._gemini_json",
        lambda *args: {
            "is_food": True,
            "food_items": [
                {
                    "name": "Food",
                    "quantity": "1 plate",
                    "calories": -100,
                    "protein_g": 1,
                    "carbs_g": 1,
                    "fat_g": 1,
                }
            ],
        },
    )
    import io
    from PIL import Image

    buffer = io.BytesIO()
    Image.new("RGB", (2, 2), "white").save(buffer, format="PNG")
    image = base64.b64encode(buffer.getvalue()).decode()
    result = client.post(
        "/api/ai/analyze-meal",
        headers=user_a["headers"],
        json={"imageBase64": image, "consentAI": True},
    ).json()
    assert result["isFood"] is False
    assert "could not be validated" in result["error"]


def test_records_encrypted_at_rest(client, monkeypatch):
    from cryptography.fernet import Fernet

    monkeypatch.setattr(settings, "DATA_ENCRYPTION_KEY", Fernet.generate_key().decode())
    records = DurableMap("encryption-test")
    records["secret"] = {"user_id": "test", "note": "private medical value"}
    with transaction() as conn:
        raw = execute(
            conn,
            "SELECT value FROM app_records WHERE namespace=?",
            ("encryption-test",),
        ).fetchone()[0]
    assert raw.startswith("enc:")
    assert "private medical value" not in raw
    assert records["secret"]["note"] == "private medical value"
    del records["secret"]


def test_production_rejects_unprotected_storage(client, monkeypatch):
    from storage import initialize

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(
        settings, "DATABASE_URL", "sqlite:///./should-not-create.sqlite3"
    )
    with pytest.raises(RuntimeError, match="PostgreSQL"):
        initialize()


def test_mobile_report_is_persisted_and_reviewed_for_shared_chat(
    client, user_a, user_b
):
    result = client.post(
        "/api/reports/analyze",
        headers=user_a["headers"],
        json={
            "documentText": "Patient laboratory report\nHemoglobin 14.2 g/dL Reference 13.0 - 17.0"
        },
    ).json()["report"]
    rid = result["id"]
    assert result["userId"] == user_a["user_id"]
    assert result["testResults"][0]["reviewStatus"] == "proposed"
    assert all(
        r["id"] != rid
        for r in client.get("/api/reports", headers=user_b["headers"]).json()
    )
    before = client.post(
        "/v1/chat",
        headers=user_a["headers"],
        json={"query": "hemoglobin", "report_id": rid},
    ).json()
    assert "14.2" not in before["answer"]
    reviewed = client.patch(
        "/v1/reports/" + rid + "/observations",
        headers=user_a["headers"],
        json={
            "observations": [
                {"id": result["testResults"][0]["observationId"], "status": "confirmed"}
            ]
        },
    )
    assert reviewed.status_code == 200
    after = client.post(
        "/api/ai/chat", headers=user_a["headers"], json={"query": "hemoglobin"}
    ).json()
    assert "14.2" in after["response"]


def test_image_analysis_requires_consent(client, user_a):
    result = client.post(
        "/api/ai/analyze-meal", headers=user_a["headers"], json={"imageBase64": "fake"}
    )
    assert result.status_code == 422


def test_unknown_allergy_is_not_silently_ignored(client, user_a):
    result = client.post(
        "/v1/plans",
        headers=user_a["headers"],
        json={"allergens": ["unmapped ingredient"]},
    )
    assert result.status_code == 422


def test_meal_combinations_include_multiple_components_and_match_totals(client, user_a):
    plan = client.post(
        "/v1/plans", headers=user_a["headers"], json={"allergens": ["milk", "mustard"]}
    ).json()
    for day in plan["days"]:
        for slot in ("lunch", "dinner"):
            assert day["meals"][slot]["name"].count(" + ") == 2
            assert not set(day["meals"][slot]["allergens"]) & {"dairy", "mustard"}
        assert day["daily_nutrition_summary"]["calories"] == sum(
            m["nutrition"]["calories"] for m in day["meals"].values()
        )


def test_concurrent_log_writes_are_durable_and_isolated(client, user_a):
    from concurrent.futures import ThreadPoolExecutor

    def write(index):
        return client.post(
            "/v1/logs",
            headers=user_a["headers"],
            json={
                "kind": "water",
                "value": 100,
                "unit": "ml",
                "occurred_at": "2026-10-16T08:00:00Z",
                "mutation_id": str(uuid.uuid4()),
            },
        ).status_code

    with ThreadPoolExecutor(max_workers=4) as pool:
        assert list(pool.map(write, range(8))) == [200] * 8
    assert len(client.get("/v1/logs", headers=user_a["headers"]).json()) == 8


def test_oversized_requests_are_rejected_before_parsing(client):
    assert (
        client.post(
            "/api/reports/analyze",
            content=b"{}",
            headers={"Content-Length": str(16 * 1024 * 1024)},
        ).status_code
        == 413
    )


def test_unknown_or_invalid_observation_updates_are_rejected(client, user_a):
    rid = client.post(
        "/v1/reports",
        headers=user_a["headers"],
        files={"file": ("lab.pdf", synthetic_pdf(), "application/pdf")},
    ).json()["report_id"]
    result = client.patch(
        "/v1/reports/" + rid + "/observations",
        headers=user_a["headers"],
        json={"observations": [{"id": str(uuid.uuid4()), "status": "confirmed"}]},
    )
    assert result.status_code == 422
    assert (
        client.patch(
            "/v1/reports/" + rid + "/observations",
            headers=user_a["headers"],
            json={
                "observations": [
                    {"id": str(uuid.uuid4()), "status": "clinically_verified"}
                ]
            },
        ).status_code
        == 422
    )


def test_export_contains_only_own_records(client, user_a, user_b):
    client.put("/v1/me", headers=user_a["headers"], json={"name": "Only owner A"})
    client.put("/v1/me", headers=user_b["headers"], json={"name": "Only owner B"})
    data = client.get("/v1/me/export", headers=user_a["headers"])
    assert data.status_code == 200
    assert "Only owner A" in data.text
    assert "Only owner B" not in data.text
