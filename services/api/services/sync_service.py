from typing import List, Dict, Any

# Local store fallback for testing & local development when container DB is not active
_MUTATION_STORE: Dict[str, Dict[str, Any]] = {}

def process_sync_mutations(
    user_id: str,
    mutations: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Idempotent replay engine for offline mutations:
    Enforces unique (user_id, mutation_id).
    - If identical payload hash is replayed: returns applied idempotently (200).
    - If different payload with reused mutation_id: returns conflict (409).
    """
    results = []

    for mut in mutations:
        mutation_id = mut.get("mutation_id")
        if not mutation_id:
            results.append({
                "mutation_id": "unknown",
                "status": "error",
                "message": "Missing mutation_id"
            })
            continue

        store_key = f"{user_id}:{mutation_id}"
        payload_hash = mut.get("payload_hash", "")

        if store_key in _MUTATION_STORE:
            existing = _MUTATION_STORE[store_key]
            if existing.get("payload_hash") == payload_hash:
                # Idempotent replay of already committed mutation
                results.append({
                    "mutation_id": mutation_id,
                    "status": "applied",
                    "message": "Mutation was previously processed (idempotent)."
                })
            else:
                # Collision: Same mutation ID reused with different content
                results.append({
                    "mutation_id": mutation_id,
                    "status": "conflict",
                    "message": "Conflict: Mutation ID was already used with a different payload."
                })
        else:
            # Commit new mutation
            _MUTATION_STORE[store_key] = {
                "user_id": user_id,
                "mutation_id": mutation_id,
                "payload_hash": payload_hash,
                "payload": mut.get("payload", {}),
                "occurred_at": mut.get("occurred_at"),
                "timezone": mut.get("timezone", "Asia/Kolkata"),
            }
            results.append({
                "mutation_id": mutation_id,
                "status": "applied",
                "message": "Mutation applied successfully."
            })

    return results

def get_user_offline_logs(user_id: str) -> List[Dict[str, Any]]:
    logs = []
    prefix = f"{user_id}:"
    for k, v in _MUTATION_STORE.items():
        if k.startswith(prefix):
            payload = v.get("payload", {})
            logs.append({
                "mutation_id": v["mutation_id"],
                "kind": payload.get("kind", "water"),
                "value": payload.get("value", 0),
                "unit": payload.get("unit", "ml"),
                "occurred_at": v.get("occurred_at"),
                "timezone": v.get("timezone")
            })
    return logs
