import uuid
from datetime import datetime, timezone

def test_online_habit_logging_and_isolation(client, user_a, user_b):
    # User A logs water intake
    log_payload = {
        "kind": "water",
        "value": 500,
        "unit": "ml",
        "occurred_at": datetime.now(timezone.utc).isoformat(),
        "timezone": "Asia/Kolkata",
    }
    res_a = client.post("/v1/logs", headers=user_a["headers"], json=log_payload)
    assert res_a.status_code == 200
    assert res_a.json()["kind"] == "water"
    assert res_a.json()["value"] == 500
    assert res_a.json()["user_id"] == user_a["user_id"]

    # User B lists logs (User A's log must not appear)
    res_b = client.get("/v1/logs", headers=user_b["headers"])
    assert res_b.status_code == 200
    b_logs = res_b.json()
    assert not any(l["user_id"] == user_a["user_id"] for l in b_logs)

def test_offline_sync_idempotency_and_conflict_handling(client, user_a):
    mut_id = str(uuid.uuid4())
    now_str = datetime.now(timezone.utc).isoformat()

    valid_mutation = {
        "mutation_id": mut_id,
        "user_id": user_a["user_id"],
        "device_id": "device_mobile_test",
        "entity_type": "health_log",
        "payload": {"kind": "sleep", "value": 7.5, "unit": "hours"},
        "payload_hash": "hash_sleep_7_5",
        "occurred_at": now_str,
        "timezone": "Asia/Kolkata"
    }

    # 1. Initial replay should apply successfully
    res1 = client.post(
        "/v1/sync/logs",
        headers=user_a["headers"],
        json={"mutations": [valid_mutation]}
    )
    assert res1.status_code == 200
    assert res1.json()["results"][0]["mutation_id"] == mut_id
    assert res1.json()["results"][0]["status"] == "applied"

    # 2. Duplicate replay with exact same hash should be idempotent (returns applied without error)
    res2 = client.post(
        "/v1/sync/logs",
        headers=user_a["headers"],
        json={"mutations": [valid_mutation]}
    )
    assert res2.status_code == 200
    assert res2.json()["results"][0]["status"] == "applied"

    # 3. Duplicate replay with CHANGED payload hash must report conflict (409 logic)
    conflict_mutation = dict(valid_mutation)
    conflict_mutation["payload_hash"] = "hash_sleep_tampered"
    conflict_mutation["payload"] = {"kind": "sleep", "value": 9.0, "unit": "hours"}

    res3 = client.post(
        "/v1/sync/logs",
        headers=user_a["headers"],
        json={"mutations": [conflict_mutation]}
    )
    assert res3.status_code == 200
    assert res3.json()["results"][0]["status"] == "conflict"
    assert "Conflict" in res3.json()["results"][0]["message"]

def test_reminder_lifecycle_and_completion(client, user_a, user_b):
    # Create reminder for User A
    rem_payload = {
        "label": "Drink 2 glasses of lukewarm water",
        "user_entered_schedule": "08:00 AM",
        "timezone": "Asia/Kolkata",
        "enabled": True
    }
    res = client.post("/v1/reminders", headers=user_a["headers"], json=rem_payload)
    assert res.status_code == 200
    rem_id = res.json()["id"]

    # User B cannot see User A's reminder
    b_reminders = client.get("/v1/reminders", headers=user_b["headers"]).json()
    assert not any(r["id"] == rem_id for r in b_reminders)

    # Complete reminder
    comp_res = client.post(
        f"/v1/reminders/{rem_id}/complete",
        headers=user_a["headers"],
        json={
            "due_at": "2026-10-02T08:00:00Z",
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "mutation_id": str(uuid.uuid4())
        }
    )
    assert comp_res.status_code == 200
    assert comp_res.json()["reminder_id"] == rem_id

    # Delete reminder
    del_res = client.delete(f"/v1/reminders/{rem_id}", headers=user_a["headers"])
    assert del_res.status_code == 200
