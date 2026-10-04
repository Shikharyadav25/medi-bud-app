from typing import Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel
from services.meal_vision_service import analyze_meal_image

mobile_ai_router = APIRouter(tags=["Mobile AI Integration"])

class MealAnalyzeRequest(BaseModel):
    imageBase64: Optional[str] = None
    image_base64: Optional[str] = None
    profile: Optional[Dict[str, Any]] = None

@mobile_ai_router.post("/api/ai/analyze-meal")
@mobile_ai_router.post("/v1/diet/analyze-meal")
async def analyze_meal_endpoint(req: MealAnalyzeRequest):
    """
    Multimodal meal image analysis endpoint.
    Accepts base64 image data and evaluates food items, portions, and macros using Gemini Vision.
    Rejects non-food images with isFood=False.
    """
    img_data = req.imageBase64 or req.image_base64 or ""
    return analyze_meal_image(image_base64=img_data, profile=req.profile)
