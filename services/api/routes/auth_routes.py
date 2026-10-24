from typing import Optional, Annotated
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal
from auth import get_current_user, AuthenticatedUser
from storage import DurableMap, delete_user_data, transaction, execute, _decode
from config import settings
import base64

auth_router = APIRouter(prefix="/v1", tags=["Profile & Auth"])

# Durable owner-scoped profile records.
_USER_PROFILES = DurableMap("profiles")
BoundedText = Annotated[str, Field(min_length=1, max_length=200)]


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(allow_inf_nan=False, extra="forbid")
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    age: Optional[int] = Field(default=None, ge=18, le=120)
    height_cm: Optional[float] = Field(default=None, ge=50, le=260)
    weight_kg: Optional[float] = Field(default=None, gt=0, le=500)
    locale: Optional[Literal["en", "hi"]] = "en"
    goals: Optional[list[BoundedText]] = Field(default=None, max_length=30)
    dietary_preferences: Optional[list[BoundedText]] = Field(
        default=None, max_length=30
    )
    declared_allergens: Optional[list[BoundedText]] = Field(default=None, max_length=30)
    conditions: Optional[list[BoundedText]] = Field(default=None, max_length=30)
    medications: Optional[list[BoundedText]] = Field(default=None, max_length=30)
    version: int = 1


@auth_router.get("/me")
async def get_profile(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    if user_id not in _USER_PROFILES:
        _USER_PROFILES[user_id] = {
            "user_id": user_id,
            "name": current_user.display_name or "User",
            "age": None,
            "height_cm": None,
            "weight_kg": None,
            "locale": "en",
            "goals": [],
            "dietary_preferences": [],
            "declared_allergens": [],
            "conditions": [],
            "medications": [],
            "version": 1,
        }
    profile = _USER_PROFILES[user_id]
    if profile.get("name") == "User" and current_user.display_name:
        profile["name"] = current_user.display_name
        profile["version"] += 1
        _USER_PROFILES[user_id] = profile
    return profile


@auth_router.put("/me")
async def update_profile(
    data: ProfileUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    user_id = current_user.user_id
    current = _USER_PROFILES.get(
        user_id,
        {
            "user_id": user_id,
            "name": current_user.display_name or "User",
            "age": None,
            "height_cm": None,
            "weight_kg": None,
            "locale": "en",
            "goals": [],
            "dietary_preferences": [],
            "declared_allergens": [],
            "conditions": [],
            "medications": [],
            "version": 1,
        },
    )

    # Optimistic concurrency check
    if data.version != current["version"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "VERSION_CONFLICT",
                "message": f"Conflict: Sent version ({data.version}) does not match current version ({current['version']}).",
            },
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
    identity_deleted = False
    if settings.SUPABASE_SERVICE_ROLE_KEY:
        import httpx

        try:
            async with httpx.AsyncClient(timeout=10) as client:
                result = await client.delete(
                    settings.SUPABASE_URL.rstrip("/")
                    + "/auth/v1/admin/users/"
                    + user_id,
                    headers={
                        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": "Bearer " + settings.SUPABASE_SERVICE_ROLE_KEY,
                    },
                )
                identity_deleted = result.status_code in (200, 204, 404)
        except httpx.HTTPError:
            pass
    delete_user_data(user_id)
    return {
        "identity_deleted": identity_deleted,
        "message": "Your API health data has been deleted and API access revoked. "
        + (
            "Your sign-in identity has also been removed."
            if identity_deleted
            else "Sign-in identity removal is pending administrator completion."
        )
        + " Backups follow the deployment retention policy.",
    }


@auth_router.get("/me/export")
async def export_account(current_user: AuthenticatedUser = Depends(get_current_user)):
    uid = current_user.user_id
    with transaction() as conn:
        rows = execute(conn, "SELECT namespace,key,value FROM app_records").fetchall()
    reports = {
        key
        for ns, key, raw in rows
        if ns == "reports" and _decode(raw).get("user_id") == uid
    }
    exported = []
    for ns, key, raw in rows:
        value = _decode(raw)
        if (
            key == uid
            or key.startswith(uid + ":")
            or key in reports
            or isinstance(value, dict)
            and value.get("user_id") == uid
        ):
            exported.append(
                {
                    "collection": ns,
                    "id": key,
                    "data": base64.b64encode(value).decode()
                    if isinstance(value, bytes)
                    else value,
                }
            )
    return {"user_id": uid, "records": exported, "file_encoding": "base64"}
