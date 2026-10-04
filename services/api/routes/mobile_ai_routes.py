from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from services.meal_vision_service import analyze_meal_image
from services.mobile_ai_service import analyze_medical_document, grounded_mobile_chat
from services.plan_service import generate_7day_indian_plan

mobile_ai_router = APIRouter(tags=["Mobile AI Integration"])


class MealAnalyzeRequest(BaseModel):
    imageBase64: Optional[str] = None
    image_base64: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None


class MobileChatRequest(BaseModel):
    query: str
    profile: Dict[str, Any] = Field(default_factory=dict)
    vitals: Dict[str, Any] = Field(default_factory=dict)
    activity: Dict[str, Any] = Field(default_factory=dict)
    reports: List[Dict[str, Any]] = Field(default_factory=list)
    activePlanSummary: str = ""


class MobileDietRequest(BaseModel):
    profile: Dict[str, Any] = Field(default_factory=dict)
    vitals: Dict[str, Any] = Field(default_factory=dict)
    calorieGoal: Optional[int] = None


class MobileSymptomRequest(BaseModel):
    symptoms: str


class MobileReportRequest(BaseModel):
    documentText: str = ""
    dataBase64: str = ""
    mimeType: str = "application/pdf"
    title: str = "Medical report"


@mobile_ai_router.post("/api/ai/analyze-meal")
@mobile_ai_router.post("/v1/diet/analyze-meal")
async def analyze_meal_endpoint(req: MealAnalyzeRequest):
    return analyze_meal_image(image_base64=req.imageBase64 or req.image_base64 or "", profile=req.profile)


@mobile_ai_router.post("/api/ai/chat")
async def mobile_chat(req: MobileChatRequest):
    return grounded_mobile_chat(req.query, req.profile, req.vitals, req.activity, req.reports)


def _mobile_meal(food: Dict[str, Any]) -> Dict[str, Any]:
    nutrition = food.get("nutrition", {})
    return {
        "name": food.get("name", "Indian meal"), "portion": food.get("portion_basis", "1 serving"),
        "approxCalories": nutrition.get("calories", 0), "proteinG": nutrition.get("protein_g", 0),
        "carbsG": nutrition.get("carbs_g", 0), "fatG": nutrition.get("fat_g", 0),
        "notes": "Selected from the curated Indian food catalogue with declared allergen filtering.", "alternatives": [],
    }


@mobile_ai_router.post("/api/ai/generate-diet")
async def mobile_diet(req: MobileDietRequest):
    profile = req.profile
    preferences = profile.get("dietaryPreferences", [])
    is_veg = not any("non-vegetarian" in str(item).lower() for item in preferences)
    source = generate_7day_indian_plan(is_veg=is_veg, declared_allergens=profile.get("allergies", []))
    names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    days = []
    for idx, day in enumerate(source["days"]):
        meals = day["meals"]
        days.append({
            "dayNumber": idx + 1, "dayName": names[idx],
            "meals": {"breakfast": _mobile_meal(meals["breakfast"]), "lunch": _mobile_meal(meals["lunch"]), "eveningSnack": _mobile_meal(meals["snack"]), "dinner": _mobile_meal(meals["dinner"])},
        })
    calorie_goal = req.calorieGoal or 2000
    return {
        "title": f"7-Day Indian Wellness Plan for {profile.get('name') or 'You'}", "targetDailyCalories": calorie_goal,
        "macroTargets": {"proteinG": round(calorie_goal * 0.18 / 4), "carbsG": round(calorie_goal * 0.52 / 4), "fatG": round(calorie_goal * 0.30 / 9)},
        "days": days, "dietitianRationale": "Meals are selected deterministically from the curated catalogue after filtering dietary category and declared allergens.",
        "disclaimer": source["disclaimer"],
    }


@mobile_ai_router.post("/api/ai/symptom-triage")
async def mobile_symptoms(req: MobileSymptomRequest):
    text = req.symptoms.lower()
    emergency = any(term in text for term in ("chest pain", "cannot breathe", "can't breathe", "face drooping", "slurred speech", "unconscious", "severe bleeding"))
    urgent = any(term in text for term in ("high fever", "persistent vomiting", "worsening", "severe pain"))
    if emergency:
        return {"triageLevel": "EMERGENCY", "isEmergency": True, "emergencyType": "Red-flag symptom", "advisoryMessage": "Call 112 or 108 now or go to the nearest emergency department.", "disclaimer": "Rule-based safety escalation—not a diagnosis."}
    if urgent:
        return {"triageLevel": "SEE_DOCTOR_SOON", "isEmergency": False, "advisoryMessage": "Arrange an in-person clinical assessment today or within 24 hours, especially if symptoms worsen.", "disclaimer": "Rule-based safety guidance—not a diagnosis."}
    return {"triageLevel": "MONITOR", "isEmergency": False, "advisoryMessage": "No emergency phrase was detected. Rest, hydrate as appropriate, and seek care if symptoms persist or worsen.", "disclaimer": "Rule-based safety guidance—not a diagnosis."}


@mobile_ai_router.post("/api/reports/analyze")
async def mobile_report(req: MobileReportRequest):
    return analyze_medical_document(req.dataBase64, req.mimeType, req.title, req.documentText)
