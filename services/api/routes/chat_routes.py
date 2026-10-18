from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from auth import get_current_user, AuthenticatedUser
from services.orchestrator import orchestrate_chat_query
from routes.report_routes import _USER_OBSERVATIONS, _USER_REPORTS
from storage import DurableMap

chat_router = APIRouter(prefix="/v1", tags=["Health Q&A Chat"])

_USER_CONVERSATIONS = DurableMap("conversations")


class ChatRequest(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    report_id: Optional[str] = None
    conversation_id: Optional[str] = None


@chat_router.post("/chat")
async def chat(
    req: ChatRequest, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    if req.report_id:
        report = _USER_REPORTS.get(req.report_id)
        if not report or report["user_id"] != user_id:
            raise HTTPException(404, detail="Report not found")
    if not req.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_QUERY", "message": "Query text cannot be empty"},
        )

    # Never put unreviewed raw report text into AI retrieval. Only explicitly
    # confirmed observation values may be used as patient-specific evidence.
    user_chunks = []

    # Gather confirmed observations belonging to user
    confirmed_obs = []
    for r_id, obs_list in _USER_OBSERVATIONS.items():
        confirmed_obs.extend(
            [
                o
                for o in obs_list
                if o.get("user_id") == user_id and o.get("status") == "confirmed"
            ]
        )

    result = orchestrate_chat_query(
        user_id=user_id,
        query=req.query,
        user_report_chunks=user_chunks,
        user_confirmed_observations=confirmed_obs,
        specific_report_id=req.report_id,
    )

    # Record message history
    conv_id = req.conversation_id or "default"
    store_key = user_id + ":" + conv_id
    messages = _USER_CONVERSATIONS.get(store_key, [])
    messages.append({"role": "user", "text": req.query, "mode": result.get("mode")})
    messages.append(
        {
            "role": "assistant",
            "text": result.get("answer"),
            "citations": result.get("citations", []),
            "mode": result.get("mode"),
        }
    )

    _USER_CONVERSATIONS[store_key] = messages[-200:]
    return result


@chat_router.get("/conversations")
async def get_conversation_history(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    user_id = current_user.user_id
    return [
        message
        for key, history in _USER_CONVERSATIONS.items()
        if key == user_id or key.startswith(user_id + ":")
        for message in history
    ]


@chat_router.delete("/conversations/{conv_id}")
async def delete_conversation(
    conv_id: str, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    _USER_CONVERSATIONS.pop(user_id + ":" + conv_id, None)
    return {"message": "Conversation history cleared successfully."}
