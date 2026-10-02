import uuid
from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from auth import get_current_user, AuthenticatedUser

auth_router = APIRouter(prefix="/v1", tags=["Profile & Auth"])

# In-memory user state fallback for demo / test execution
_USER_PROFILES: Dict[str, Dict[str, Any]] = {}

class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    locale: Optional[str] = "en"
    goals: Optional[list[str]] = None
    dietary_preferences: Optional[list[str]] = None
    declared_allergens: Optional[list[str]] = None
    conditions: Optional[list[str]] = None
    medications: Optional[list[str]] = None
    version: int = 1

@auth_router.get("/me")
async def get_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    if user_id not in _USER_PROFILES:
        _USER_PROFILES[user_id] = {
            "user_id": user_id,
            "name": "User",
            "age": 22,
            "height_cm": 172.0,
            "weight_kg": 68.0,
            "locale": "en",
            "goals": ["hydration", "sleep"],
            "dietary_preferences": ["vegetarian"],
            "declared_allergens": [],
            "conditions": [],
            "medications": [],
            "version": 1
        }
    return _USER_PROFILES[user_id]

@auth_router.put("/me")
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    current = _USER_PROFILES.get(user_id, {
        "user_id": user_id,
        "name": "User",
        "age": 22,
        "height_cm": 172.0,
        "weight_kg": 68.0,
        "locale": "en",
        "goals": [],
        "dietary_preferences": [],
        "declared_allergens": [],
        "conditions": [],
        "medications": [],
        "version": 1
    })

    # Optimistic concurrency check
    if data.version != current["version"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "VERSION_CONFLICT",
                "message": f"Conflict: Sent version ({data.version}) does not match current version ({current['version']})."
            }
        )

    for field, val in data.model_dump(exclude_unset=True).items():
        if field != "version" and val is not None:
            current[field] = val

    current["version"] += 1
    _USER_PROFILES[user_id] = current
    return current

@auth_router.delete("/me")
async def delete_account(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    _USER_PROFILES.pop(user_id, None)
    return {"message": "Account and all associated personal data have been completely deleted."}
