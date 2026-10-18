from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from services.meal_vision_service import analyze_meal_image
from services.mobile_ai_service import analyze_medical_document
from services.plan_service import generate_7day_indian_plan
from auth import get_current_user, AuthenticatedUser, require_ai_budget
from config import settings
from services.orchestrator import orchestrate_chat_query, check_emergency_signals
from routes.report_routes import _USER_OBSERVATIONS
from starlette.concurrency import run_in_threadpool
from routes.report_routes import _USER_REPORTS, _REPORT_RAW_BYTES, _USER_CHUNKS
from datetime import datetime, timezone
import uuid
import base64
import re


def mobile_report_view(report, observations):
    original = report.get("mobile_report", {})
    return {
        **original,
        "id": report["id"],
        "userId": report["user_id"],
        "title": original.get("title", report["filename"]),
        "reportType": original.get("reportType", "Pathology"),
        "date": original.get("date", report.get("report_date") or "Date not detected"),
        "testResults": [
            {
                "testName": o["original_label"],
                "value": o["value_text"],
                "unit": o["unit"],
                "referenceRange": o.get("reference_text") or "Not shown",
                "status": "UNVERIFIED",
                "observationId": o["id"],
                "reviewStatus": o["status"],
            }
            for o in observations
        ],
        "aiExplanation": "Check every value and unit against the original. Confirmed means reviewed by you, not clinically validated.",
        "lifestyleRecommendations": [],
        "questionsForDoctor": ["Which findings need follow-up?"],
        "chunksIndexed": 0,
    }


mobile_ai_router = APIRouter(
    tags=["Mobile AI Integration"], dependencies=[Depends(get_current_user)]
)


class MealAnalyzeRequest(BaseModel):
    consentAI: bool = False
    imageBase64: Optional[str] = None
    image_base64: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None


class MobileChatRequest(BaseModel):
    report_id: Optional[str] = None
    query: str = Field(min_length=1, max_length=4000)
    profile: Dict[str, Any] = Field(default_factory=dict)
    vitals: Dict[str, Any] = Field(default_factory=dict)
    activity: Dict[str, Any] = Field(default_factory=dict)
    reports: List[Dict[str, Any]] = Field(default_factory=list)
    activePlanSummary: str = ""


class MobileDietProfile(BaseModel):
    name: str = Field(default="", max_length=120)
    dietaryPreferences: List[str] = Field(default_factory=list, max_length=30)
    allergies: List[str] = Field(default_factory=list, max_length=30)


class MobileDietRequest(BaseModel):
    profile: MobileDietProfile = Field(default_factory=MobileDietProfile)
    vitals: Dict[str, Any] = Field(default_factory=dict)
    calorieGoal: Optional[int] = None


class MobileSymptomRequest(BaseModel):
    symptoms: str = Field(min_length=1, max_length=4000)


class MobileReportRequest(BaseModel):
    consentAI: bool = False
    documentText: str = Field(default="", max_length=100000)
    dataBase64: str = Field(default="", max_length=14000000)
    mimeType: str = "application/pdf"
    title: str = "Medical report"


@mobile_ai_router.post(
    "/api/ai/analyze-meal", dependencies=[Depends(require_ai_budget)]
)
@mobile_ai_router.post(
    "/v1/diet/analyze-meal", dependencies=[Depends(require_ai_budget)]
)
async def analyze_meal_endpoint(req: MealAnalyzeRequest):
    if not req.consentAI:
        raise HTTPException(
            422, detail="Consent is required to send the photo to Google Gemini"
        )
    return await run_in_threadpool(
        analyze_meal_image,
        image_base64=req.imageBase64 or req.image_base64 or "",
        profile=req.profile,
    )


@mobile_ai_router.post("/api/ai/chat")
async def mobile_chat(
    req: MobileChatRequest, user: AuthenticatedUser = Depends(get_current_user)
):
    if req.report_id:
        report = _USER_REPORTS.get(req.report_id)
        if not report or report["user_id"] != user.user_id:
            raise HTTPException(404, detail="Report not found")
    observations = [
        o
        for rows in _USER_OBSERVATIONS.values()
        for o in rows
        if o.get("user_id") == user.user_id and o.get("status") == "confirmed"
    ]
    result = orchestrate_chat_query(
        user.user_id, req.query, [], observations, req.report_id
    )
    return {
        "response": result["answer"],
        "citations": [c.get("title", "Source") for c in result.get("citations", [])],
        "action": "EMERGENCY"
        if result.get("safety_action") == "EMERGENCY_ESCALATION"
        else "MONITOR",
        "disclaimer": result.get("limitations", "Educational guidance only"),
    }


def _mobile_meal(food: Dict[str, Any]) -> Dict[str, Any]:
    nutrition = food.get("nutrition", {})
    return {
        "name": food.get("name", "Indian meal"),
        "portion": food.get("portion_basis", "1 serving"),
        "approxCalories": nutrition.get("calories", 0),
        "proteinG": nutrition.get("protein_g", 0),
        "carbsG": nutrition.get("carbs_g", 0),
        "fatG": nutrition.get("fat_g", 0),
        "notes": "Selected from the curated Indian food catalogue with declared allergen filtering.",
        "alternatives": [],
    }


@mobile_ai_router.post("/api/ai/generate-diet")
async def mobile_diet(req: MobileDietRequest):
    profile = req.profile.model_dump()
    preferences = profile.get("dietaryPreferences", [])
    is_veg = not any("non-vegetarian" in str(item).lower() for item in preferences)
    allergies = list(profile.get("allergies", []))
    if any("vegan" in str(item).lower() for item in preferences):
        allergies.extend(["dairy", "eggs"])
    try:
        source = generate_7day_indian_plan(is_veg=is_veg, declared_allergens=allergies)
    except ValueError as exc:
        raise HTTPException(422, detail=str(exc))
    names = [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday",
    ]
    days = []
    for idx, day in enumerate(source["days"]):
        meals = day["meals"]
        days.append(
            {
                "dayNumber": idx + 1,
                "dayName": names[idx],
                "meals": {
                    "breakfast": _mobile_meal(meals["breakfast"]),
                    "lunch": _mobile_meal(meals["lunch"]),
                    "eveningSnack": _mobile_meal(meals["snack"]),
                    "dinner": _mobile_meal(meals["dinner"]),
                },
            }
        )
    calorie_goal = round(
        sum(d["daily_nutrition_summary"]["calories"] for d in source["days"]) / 7
    )
    return {
        "title": f"7-Day Indian Wellness Plan for {profile.get('name') or 'You'}",
        "targetDailyCalories": calorie_goal,
        "macroTargets": {
            "proteinG": round(
                sum(d["daily_nutrition_summary"]["protein_g"] for d in source["days"])
                / 7
            ),
            "carbsG": round(
                sum(d["daily_nutrition_summary"]["carbs_g"] for d in source["days"]) / 7
            ),
            "fatG": round(
                sum(d["daily_nutrition_summary"]["fat_g"] for d in source["days"]) / 7
            ),
        },
        "days": days,
        "dietitianRationale": "Meals are selected deterministically from the curated catalogue after filtering dietary category and declared allergens.",
        "disclaimer": source["disclaimer"],
    }


@mobile_ai_router.post("/api/ai/symptom-triage")
async def mobile_symptoms(req: MobileSymptomRequest):
    text = req.symptoms.lower()
    emergency = check_emergency_signals(text)
    urgent = any(
        term in text
        for term in ("high fever", "persistent vomiting", "worsening", "severe pain")
    )
    if emergency:
        return {
            "triageLevel": "EMERGENCY",
            "isEmergency": True,
            "emergencyType": "Red-flag symptom",
            "advisoryMessage": "Call 112 or 108 now or go to the nearest emergency department.",
            "disclaimer": "Rule-based safety escalation—not a diagnosis.",
        }
    if urgent:
        return {
            "triageLevel": "SEE_DOCTOR_SOON",
            "isEmergency": False,
            "advisoryMessage": "Arrange an in-person clinical assessment today or within 24 hours, especially if symptoms worsen.",
            "disclaimer": "Rule-based safety guidance—not a diagnosis.",
        }
    return {
        "triageLevel": "MONITOR",
        "isEmergency": False,
        "advisoryMessage": "This limited phrase check cannot rule out an emergency or assess the cause. If you feel seriously unwell, seek urgent care. Contact a clinician for persistent, new, or concerning symptoms.",
        "disclaimer": "Limited automated guidance. A missed phrase does not mean symptoms are safe.",
    }


@mobile_ai_router.post(
    "/api/reports/analyze", dependencies=[Depends(require_ai_budget)]
)
async def mobile_report(
    req: MobileReportRequest, user: AuthenticatedUser = Depends(get_current_user)
):
    if (
        sum(r["user_id"] == user.user_id for r in _USER_REPORTS.values())
        >= settings.MAX_REPORTS_PER_USER
    ):
        raise HTTPException(
            409,
            detail="Report storage limit reached. Export or remove older reports before uploading more.",
        )
    result = await run_in_threadpool(
        analyze_medical_document,
        req.dataBase64,
        req.mimeType,
        req.title,
        req.documentText,
        req.consentAI,
    )
    if result.get("report"):
        mobile = result["report"]
        report_id = str(uuid.uuid4())
        observations = []
        for test in mobile.get("testResults", []):
            value = str(test.get("value", ""))[:100]
            numeric = float(value) if re.fullmatch(r"-?\d+(?:\.\d+)?", value) else None
            observations.append(
                {
                    "id": str(uuid.uuid4()),
                    "report_id": report_id,
                    "user_id": user.user_id,
                    "original_label": str(test.get("testName", "Test"))[:120],
                    "canonical_test": str(test.get("testName", "Test"))[:120],
                    "value_text": value,
                    "numeric_value": numeric,
                    "comparator": None,
                    "unit": str(test.get("unit", ""))[:50],
                    "reference_text": str(test.get("referenceRange", ""))[:200],
                    "bounds_low": None,
                    "bounds_high": None,
                    "status": "proposed",
                    "page": 1,
                }
            )
        raw = base64.b64decode(req.dataBase64, validate=True) if req.dataBase64 else b""
        mime = (
            "application/pdf"
            if raw.startswith(b"%PDF")
            else "image/png"
            if raw.startswith(b"\x89PNG")
            else "image/jpeg"
            if raw
            else "text/plain"
        )
        record = {
            "id": report_id,
            "user_id": user.user_id,
            "filename": req.title[:200],
            "mime": mime,
            "status": "review_needed",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "report_date": None,
            "observations_count": len(observations),
            "object_key": user.user_id + "/" + report_id,
            "checksum": "",
            "mobile_report": mobile,
        }
        _USER_REPORTS[report_id] = record
        _USER_OBSERVATIONS[report_id] = observations
        _USER_CHUNKS[report_id] = []
        if raw:
            _REPORT_RAW_BYTES[report_id] = raw
        result["report"] = mobile_report_view(record, observations)
    return result


@mobile_ai_router.get("/api/reports")
async def mobile_reports(user: AuthenticatedUser = Depends(get_current_user)):
    return [
        mobile_report_view(r, _USER_OBSERVATIONS.get(r["id"], []))
        for r in _USER_REPORTS.values()
        if r["user_id"] == user.user_id
    ]
