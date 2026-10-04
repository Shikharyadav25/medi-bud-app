import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from auth import get_current_user, AuthenticatedUser

reminder_router = APIRouter(prefix="/v1/reminders", tags=["Reminders"])

_USER_REMINDERS: List[Dict[str, Any]] = [
    {
        "id": "rem-1",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "label": "Morning hydration (2 glasses of water)",
        "user_entered_schedule": "08:00 AM",
        "timezone": "Asia/Kolkata",
        "enabled": True
    },
    {
        "id": "rem-2",
        "user_id": "00000000-0000-0000-0000-000000000001",
        "label": "Evening brisk walk (30 mins)",
        "user_entered_schedule": "06:00 PM",
        "timezone": "Asia/Kolkata",
        "enabled": True
    }
]
_USER_COMPLETIONS: List[Dict[str, Any]] = []

class ReminderCreate(BaseModel):
    label: str
    user_entered_schedule: str
    timezone: str = "Asia/Kolkata"
    enabled: bool = True

class ReminderCompleteRequest(BaseModel):
    due_at: str
    completed_at: str
    mutation_id: Optional[str] = None

@reminder_router.get("")
async def get_reminders(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    return [r for r in _USER_REMINDERS if r["user_id"] == user_id]

@reminder_router.post("")
async def create_reminder(
    data: ReminderCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    item = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "label": data.label,
        "user_entered_schedule": data.user_entered_schedule,
        "timezone": data.timezone,
        "enabled": data.enabled
    }
    _USER_REMINDERS.append(item)
    return item

@reminder_router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    idx = next((i for i, r in enumerate(_USER_REMINDERS) if r["id"] == reminder_id and r["user_id"] == user_id), None)
    if idx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Reminder not found or unauthorized"}
        )
    _USER_REMINDERS.pop(idx)
    return {"message": "Reminder removed successfully."}

@reminder_router.post("/{reminder_id}/complete")
async def complete_reminder(
    reminder_id: str,
    data: ReminderCompleteRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    rem = next((r for r in _USER_REMINDERS if r["id"] == reminder_id and r["user_id"] == user_id), None)
    if not rem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Reminder not found or unauthorized"}
        )

    completion_id = str(uuid.uuid4())
    comp = {
        "id": completion_id,
        "user_id": user_id,
        "reminder_id": reminder_id,
        "due_at": data.due_at,
        "completed_at": data.completed_at,
        "mutation_id": data.mutation_id or completion_id
    }
    _USER_COMPLETIONS.append(comp)
    return comp
