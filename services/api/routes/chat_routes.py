from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from auth import get_current_user, AuthenticatedUser
from services.orchestrator import orchestrate_chat_query
from routes.report_routes import _USER_CHUNKS, _USER_OBSERVATIONS

chat_router = APIRouter(prefix="/v1", tags=["Health Q&A Chat"])

_USER_CONVERSATIONS: Dict[str, List[Dict[str, Any]]] = {}

class ChatRequest(BaseModel):
    query: str
    report_id: Optional[str] = None
    conversation_id: Optional[str] = None

@chat_router.post("/chat")
async def chat(
    req: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    if not req.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_QUERY", "message": "Query text cannot be empty"}
        )

    # Gather chunks belonging to user
    user_chunks = []
    for r_id, chunks in _USER_CHUNKS.items():
        user_chunks.extend([c for c in chunks if c.get("user_id") == user_id])

    # Gather confirmed observations belonging to user
    confirmed_obs = []
    for r_id, obs_list in _USER_OBSERVATIONS.items():
        confirmed_obs.extend([
            o for o in obs_list 
            if o.get("user_id") == user_id and o.get("status") == "confirmed"
        ])

    result = orchestrate_chat_query(
        user_id=user_id,
        query=req.query,
        user_report_chunks=user_chunks,
        user_confirmed_observations=confirmed_obs,
        specific_report_id=req.report_id
    )

    # Record message history
    conv_id = req.conversation_id or "default"
    if user_id not in _USER_CONVERSATIONS:
        _USER_CONVERSATIONS[user_id] = []
    _USER_CONVERSATIONS[user_id].append({
        "role": "user",
        "text": req.query,
        "mode": result.get("mode")
    })
    _USER_CONVERSATIONS[user_id].append({
        "role": "assistant",
        "text": result.get("answer"),
        "citations": result.get("citations", []),
        "mode": result.get("mode")
    })

    return result

@chat_router.get("/conversations")
async def get_conversation_history(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    return _USER_CONVERSATIONS.get(user_id, [])

@chat_router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    _USER_CONVERSATIONS.pop(user_id, None)
    return {"message": "Conversation history cleared successfully."}
