import uuid
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Response
from pydantic import BaseModel
from auth import get_current_user, AuthenticatedUser
from services.plan_service import load_food_catalog, generate_7day_indian_plan
from services.pdf_service import generate_meal_plan_pdf

diet_router = APIRouter(prefix="/v1", tags=["Indian Diet & Meal Planning"])

_USER_SAVED_PLANS: Dict[str, Dict[str, Any]] = {}
_USER_LOGGED_MEALS: List[Dict[str, Any]] = []

class PlanGenerateRequest(BaseModel):
    is_veg: bool = True
    allergens: Optional[List[str]] = None
    preferred_region: Optional[str] = "Pan-Indian"

class MealLogCreate(BaseModel):
    food_id: Optional[str] = None
    food_name: str
    meal_type: str
    portions: float = 1.0
    calories: float
    protein_g: float
    carbs_g: float
    fat_g: float

@diet_router.get("/foods")
async def get_food_catalog():
    return load_food_catalog()

@diet_router.post("/plans")
async def generate_plan(
    req: PlanGenerateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    plan = generate_7day_indian_plan(
        is_veg=req.is_veg,
        declared_allergens=req.allergens,
        preferred_region=req.preferred_region
    )
    plan["id"] = str(uuid.uuid4())
    plan["user_id"] = user_id
    _USER_SAVED_PLANS[user_id] = plan
    return plan

@diet_router.get("/plans")
async def get_saved_plan(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    if user_id not in _USER_SAVED_PLANS:
        # Default fallback 7-day vegetarian plan
        plan = generate_7day_indian_plan(is_veg=True, declared_allergens=[])
        plan["id"] = str(uuid.uuid4())
        plan["user_id"] = user_id
        _USER_SAVED_PLANS[user_id] = plan
    return _USER_SAVED_PLANS[user_id]

@diet_router.get("/plans/{plan_id}/pdf")
async def export_plan_pdf(
    plan_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    plan = _USER_SAVED_PLANS.get(user_id)
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "PLAN_NOT_FOUND", "message": "No saved plan found for user"}
        )

    pdf_bytes = generate_meal_plan_pdf(plan, user_name="Medi Bud User")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=medi_bud_meal_plan_{plan_id[:8]}.pdf"}
    )

@diet_router.post("/meals")
async def log_meal(
    data: MealLogCreate,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "food_id": data.food_id,
        "food_name": data.food_name,
        "meal_type": data.meal_type,
        "portions": data.portions,
        "calories": data.calories,
        "protein_g": data.protein_g,
        "carbs_g": data.carbs_g,
        "fat_g": data.fat_g,
    }
    _USER_LOGGED_MEALS.append(entry)
    return entry

@diet_router.get("/meals")
async def get_logged_meals(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    return [m for m in _USER_LOGGED_MEALS if m.get("user_id") == user_id]
