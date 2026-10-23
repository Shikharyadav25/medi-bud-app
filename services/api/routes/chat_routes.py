from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from auth import get_current_user, AuthenticatedUser
from routes.report_routes import _USER_REPORTS
from storage import DurableMap
from services.context_chat import answer_question
from starlette.concurrency import run_in_threadpool
from auth import require_ai_budget
from typing import Literal
from config import settings
from services.orchestrator import check_emergency_signals

chat_router = APIRouter(prefix="/v1", tags=["Health Q&A Chat"])

_USER_CONVERSATIONS = DurableMap("conversations")


class ChatRequest(BaseModel):
    allow_ai: bool = False
    allow_fallback: bool = False
    context_mode: Literal["auto", "account", "general"] = "auto"
    query: str = Field(min_length=1, max_length=4000)
    report_id: Optional[str] = None
    conversation_id: Optional[str] = Field(default=None, max_length=100)


@chat_router.post("/chat")
async def chat(
    req: ChatRequest, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    if req.allow_ai and not check_emergency_signals(req.query):
        await require_ai_budget(current_user)
    if req.report_id:
        report = _USER_REPORTS.get(req.report_id)
        if not report or report["user_id"] != user_id:
            raise HTTPException(404, detail="Report not found")
    if not req.query.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "EMPTY_QUERY", "message": "Query text cannot be empty"},
        )

    conv_id = req.conversation_id or "default"
    store_key = user_id + ":" + conv_id
    messages = _USER_CONVERSATIONS.get(store_key, [])
    result = await run_in_threadpool(
        answer_question,
        user_id,
        req.query,
        req.report_id,
        req.allow_ai,
        req.allow_fallback,
        req.context_mode,
        messages[-6:],
    )

    # Record message history
    messages.append(
        {
            "role": "user",
            "text": req.query,
            "mode": result.get("mode"),
            "context_scope": result.get("context_scope"),
            "report_id": req.report_id,
        }
    )
    messages.append(
        {
            "role": "assistant",
            "text": result.get("answer"),
            "citations": result.get("citations", []),
            "mode": result.get("mode"),
            "context_scope": result.get("context_scope"),
            "report_id": req.report_id,
        }
    )

    _USER_CONVERSATIONS[store_key] = messages[-200:]
    return result


@chat_router.get("/chat/capabilities")
async def chat_capabilities(
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    from services.chat_provider import effective_provider

    return {
        "gemini_configured": bool(settings.GEMINI_API_KEY),
        "groq_configured": bool(settings.GROQ_API_KEY),
        "primary": effective_provider(),
        "fallback": settings.CHAT_FALLBACK_PROVIDER,
        "account_context": "Saved profile, confirmed reports, journal, reminders, logged meals and saved plan. Unsynced device-only data is excluded.",
    }


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
