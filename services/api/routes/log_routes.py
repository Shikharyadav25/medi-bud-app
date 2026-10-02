import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from auth import get_current_user, AuthenticatedUser
from services.sync_service import process_sync_mutations, get_user_offline_logs

log_router = APIRouter(prefix="/v1", tags=["Health Habits & Logs"])

_ONLINE_LOGS: List[Dict[str, Any]] = []

class SingleLogCreate(BaseModel):
    kind: str
    value: float
    unit: str
    occurred_at: str
    timezone: str = "Asia/Kolkata"
    mutation_id: Optional[str] = None
    payload_hash: Optional[str] = None

class BatchSyncRequest(BaseModel):
    mutations: List[Dict[str, Any]]

@log_router.get("/logs")
async def get_logs(
    kind: Optional[str] = Query(None),
    limit: int = Query(50),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    # Combine online and replayed offline logs for user
    user_logs = [log for log in _ONLINE_LOGS if log.get("user_id") == user_id]
    user_logs.extend(get_user_offline_logs(user_id))

    if kind:
        user_logs = [log for log in user_logs if log.get("kind") == kind]

    user_logs.sort(key=lambda x: x.get("occurred_at", ""), reverse=True)
    return user_logs[:limit]

@log_router.post("/logs")
async def create_log(
    data: SingleLogCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    mut_id = data.mutation_id or str(uuid.uuid4())
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "kind": data.kind,
        "value": data.value,
        "unit": data.unit,
        "occurred_at": data.occurred_at,
        "timezone": data.timezone,
        "mutation_id": mut_id,
        "payload_hash": data.payload_hash or str(hash(f"{data.kind}:{data.value}"))
    }
    _ONLINE_LOGS.append(log_entry)
    return log_entry

@log_router.post("/sync/logs")
async def sync_offline_mutations(
    req: BatchSyncRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    results = process_sync_mutations(user_id=user_id, mutations=req.mutations)
    return {"results": results}
