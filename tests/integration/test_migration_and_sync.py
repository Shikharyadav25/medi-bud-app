import os
import subprocess
import sys
import uuid
from cryptography.fernet import Fernet


def test_reminder_completion_offline_replay_is_idempotent(client, user_a):
    reminder = client.post(
        "/v1/reminders",
        headers=user_a["headers"],
        json={"label": "Test reminder", "user_entered_schedule": "08:00"},
    ).json()
    mutation = {
        "mutation_id": str(uuid.uuid4()),
        "user_id": user_a["user_id"],
        "entity_type": "reminder_completion",
        "payload": {
            "reminder_id": reminder["id"],
            "due_at": "2026-10-16T08:00:00Z",
            "completed_at": "2026-10-16T08:01:00Z",
        },
        "occurred_at": "2026-10-16T08:01:00Z",
    }
    for _ in range(2):
        result = client.post(
            "/v1/sync/logs", headers=user_a["headers"], json={"mutations": [mutation]}
        )
        assert result.json()["results"][0]["status"] == "applied"
    assert client.get("/v1/logs", headers=user_a["headers"]).json() == []
    from routes.reminder_routes import _USER_COMPLETIONS

    assert sum(c["reminder_id"] == reminder["id"] for c in _USER_COMPLETIONS) == 1


def test_intent_uncertainty_does_not_hide_matching_observations(client, user_a):
    from routes.report_routes import _USER_OBSERVATIONS

    _USER_OBSERVATIONS[str(uuid.uuid4())] = [
        {
            "id": str(uuid.uuid4()),
            "user_id": user_a["user_id"],
            "canonical_test": "hemoglobin",
            "value_text": "14.2",
            "unit": "g/dL",
            "status": "confirmed",
        }
    ]
    result = client.post(
        "/api/ai/chat", headers=user_a["headers"], json={"query": "hemoglobin"}
    ).json()
    assert "14.2" in result["response"]
    assert "hba1c" not in result["response"]


def test_database_copy_reencrypts_without_modifying_source(tmp_path):
    source = "sqlite:///" + str(tmp_path / "source.sqlite3")
    destination = "sqlite:///" + str(tmp_path / "destination.sqlite3")
    source_env = {**os.environ, "DATABASE_URL": source, "DATA_ENCRYPTION_KEY": ""}
    subprocess.run(
        [
            sys.executable,
            "-c",
            'from storage import initialize,DurableMap;initialize();DurableMap("profiles")["owner"]={"name":"Synthetic migration"}',
        ],
        cwd="services/api",
        env=source_env,
        check=True,
        capture_output=True,
    )
    target_env = {
        **os.environ,
        "DATABASE_URL": destination,
        "DATA_ENCRYPTION_KEY": Fernet.generate_key().decode(),
        "MIGRATION_SOURCE_DATABASE_URL": source,
        "MIGRATION_SOURCE_ENCRYPTION_KEY": "",
    }
    subprocess.run(
        [sys.executable, "migrate_state.py"],
        cwd="services/api",
        env=target_env,
        check=True,
        capture_output=True,
    )
    result = subprocess.run(
        [
            sys.executable,
            "-c",
            'from storage import DurableMap; print(DurableMap("profiles")["owner"]["name"])',
        ],
        cwd="services/api",
        env=target_env,
        check=True,
        capture_output=True,
        text=True,
    )
    assert result.stdout.strip() == "Synthetic migration"
    assert b"Synthetic migration" not in (tmp_path / "destination.sqlite3").read_bytes()
