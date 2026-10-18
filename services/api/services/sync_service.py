"""Owner-scoped, durable and idempotent replay for habits and reminders."""

import hashlib
import json
import uuid
from pydantic import BaseModel, ConfigDict, ValidationError, field_validator
from storage import DurableMap, transaction
from validation import HealthLogInput, valid_timestamp, valid_timezone

_MUTATION_STORE = DurableMap("mutations")


class CompletionPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reminder_id: str
    due_at: str
    completed_at: str
    _dates = field_validator("due_at", "completed_at")(valid_timestamp)


def process_sync_mutations(user_id, mutations):
    from routes.reminder_routes import _USER_REMINDERS, _USER_COMPLETIONS

    results = []
    with transaction(user_id):
        for mutation in mutations:
            mid = mutation.get("mutation_id", "unknown")
            entity = mutation.get("entity_type", "health_log")
            try:
                mid = str(uuid.UUID(str(mid)))
                if mutation.get("user_id", user_id) != user_id or entity not in (
                    "health_log",
                    "reminder_completion",
                ):
                    raise ValueError("Unsupported mutation or owner mismatch")
                zone = valid_timezone(mutation.get("timezone", "Asia/Kolkata"))
                occurred = valid_timestamp(mutation["occurred_at"])
                if entity == "health_log":
                    validated = HealthLogInput.model_validate(
                        {
                            **mutation.get("payload", {}),
                            "occurred_at": occurred,
                            "timezone": zone,
                        }
                    )
                    payload = {
                        "kind": validated.kind,
                        "value": validated.value,
                        "unit": validated.unit,
                    }
                else:
                    payload = CompletionPayload.model_validate(
                        mutation.get("payload", {})
                    ).model_dump()
                    if not any(
                        r["id"] == payload["reminder_id"] and r["user_id"] == user_id
                        for r in _USER_REMINDERS
                    ):
                        raise ValueError("Reminder not found")
            except (ValidationError, ValueError, TypeError, KeyError, AttributeError):
                results.append(
                    {
                        "mutation_id": mid,
                        "status": "error",
                        "message": "Invalid entry, unsupported mutation, or owner mismatch",
                    }
                )
                continue
            canonical = {
                "entity_type": entity,
                "payload": payload,
                "occurred_at": occurred,
                "timezone": zone,
            }
            digest = hashlib.sha256(
                json.dumps(canonical, sort_keys=True, allow_nan=False).encode()
            ).hexdigest()
            key = user_id + ":" + mid
            existing = _MUTATION_STORE.get(key)
            if existing:
                status = "applied" if existing["payload_hash"] == digest else "conflict"
                results.append(
                    {
                        "mutation_id": mid,
                        "status": status,
                        "message": "Previously applied entry"
                        if status == "applied"
                        else "Conflict: entry ID was used for different data",
                    }
                )
                continue
            if entity == "reminder_completion":
                previous = next(
                    (
                        c
                        for c in _USER_COMPLETIONS
                        if c["user_id"] == user_id and c["mutation_id"] == mid
                    ),
                    None,
                )
                if previous and any(previous.get(k) != v for k, v in payload.items()):
                    results.append(
                        {
                            "mutation_id": mid,
                            "status": "conflict",
                            "message": "Conflict: completion ID was used for different data",
                        }
                    )
                    continue
                if not previous:
                    _USER_COMPLETIONS.append(
                        {
                            "id": str(uuid.uuid4()),
                            "user_id": user_id,
                            "mutation_id": mid,
                            **payload,
                        }
                    )
            _MUTATION_STORE[key] = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "mutation_id": mid,
                "payload_hash": digest,
                **canonical,
            }
            results.append(
                {"mutation_id": mid, "status": "applied", "message": "Entry saved"}
            )
    return results


def get_user_offline_logs(user_id):
    logs = []
    for key, value in _MUTATION_STORE.items():
        if (
            key.startswith(user_id + ":")
            and value.get("entity_type", "health_log") == "health_log"
        ):
            logs.append(
                {
                    "id": value["id"],
                    "user_id": user_id,
                    "mutation_id": value["mutation_id"],
                    "payload_hash": value["payload_hash"],
                    **value["payload"],
                    "occurred_at": value["occurred_at"],
                    "timezone": value["timezone"],
                }
            )
    return logs
