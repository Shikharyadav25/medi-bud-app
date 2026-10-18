import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, field_validator
from validation import valid_timezone, valid_timestamp
from auth import get_current_user, AuthenticatedUser
from storage import DurableList

reminder_router = APIRouter(prefix="/v1/reminders", tags=["Reminders"])

_USER_REMINDERS = DurableList("reminders")
_USER_COMPLETIONS = DurableList("completions")


class ReminderCreate(BaseModel):
    label: str = Field(min_length=1, max_length=120)
    user_entered_schedule: str = Field(min_length=1, max_length=100)
    timezone: str = "Asia/Kolkata"
    enabled: bool = True
    _zone = field_validator("timezone")(valid_timezone)


class ReminderCompleteRequest(BaseModel):
    due_at: str
    completed_at: str
    mutation_id: Optional[str] = None
    _dates = field_validator("due_at", "completed_at")(valid_timestamp)


@reminder_router.get("")
async def get_reminders(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    from datetime import datetime
    from zoneinfo import ZoneInfo

    completions = [c for c in _USER_COMPLETIONS if c["user_id"] == user_id]
    result = []
    for reminder in _USER_REMINDERS:
        if reminder["user_id"] != user_id:
            continue
        zone = ZoneInfo(reminder["timezone"])
        today = datetime.now(zone).date()
        completed = any(
            c["reminder_id"] == reminder["id"]
            and datetime.fromisoformat(c["completed_at"].replace("Z", "+00:00"))
            .astimezone(zone)
            .date()
            == today
            for c in completions
        )
        result.append({**reminder, "completed": completed})
    return result


@reminder_router.post("")
async def create_reminder(
    data: ReminderCreate, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    item = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "label": data.label,
        "user_entered_schedule": data.user_entered_schedule,
        "timezone": data.timezone,
        "enabled": data.enabled,
    }
    _USER_REMINDERS.append(item)
    return item


@reminder_router.delete("/{reminder_id}")
async def delete_reminder(
    reminder_id: str, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    idx = next(
        (
            i
            for i, r in enumerate(_USER_REMINDERS)
            if r["id"] == reminder_id and r["user_id"] == user_id
        ),
        None,
    )
    if idx is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": "Reminder not found or unauthorized",
            },
        )
    _USER_REMINDERS.pop(idx)
    for i in range(len(_USER_COMPLETIONS) - 1, -1, -1):
        if _USER_COMPLETIONS[i]["reminder_id"] == reminder_id:
            _USER_COMPLETIONS.pop(i)
    return {"message": "Reminder removed successfully."}


@reminder_router.post("/{reminder_id}/complete")
async def complete_reminder(
    reminder_id: str,
    data: ReminderCompleteRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    user_id = current_user.user_id
    rem = next(
        (
            r
            for r in _USER_REMINDERS
            if r["id"] == reminder_id and r["user_id"] == user_id
        ),
        None,
    )
    if not rem:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": "Reminder not found or unauthorized",
            },
        )

    completion_id = str(uuid.uuid4())
    for existing in _USER_COMPLETIONS:
        if (
            existing["user_id"] == user_id
            and existing["mutation_id"] == data.mutation_id
        ):
            if (
                existing["due_at"] != data.due_at
                or existing["completed_at"] != data.completed_at
                or existing["reminder_id"] != reminder_id
            ):
                raise HTTPException(
                    409, detail="This completion ID was used for different data"
                )
            return existing
    comp = {
        "id": completion_id,
        "user_id": user_id,
        "reminder_id": reminder_id,
        "due_at": data.due_at,
        "completed_at": data.completed_at,
        "mutation_id": data.mutation_id or completion_id,
    }
    _USER_COMPLETIONS.append(comp)
    return comp
