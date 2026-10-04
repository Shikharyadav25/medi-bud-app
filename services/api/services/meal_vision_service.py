import json
import re
import requests
from typing import Dict, Any, Optional
from config import settings

DISCLAIMER_TEXT = "AI nutritional values are estimates for wellness tracking and not clinical prescriptions."

def analyze_meal_image(image_base64: str, profile: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Sends base64 image data to Gemini Vision with structured JSON output.
    Distinguishes food from non-food images and calculates macro estimates.
    """
    if not image_base64 or len(image_base64.strip()) < 50:
        return _make_empty_response("No image data detected. Please capture or select a photo of your food.")

    mime_type = "image/jpeg"
    clean_base64 = image_base64

    # Extract mime type if data URL header is present
    if "base64," in image_base64:
        match = re.search(r"data:([^;]+);base64,", image_base64)
        if match:
            mime_type = match.group(1)
        clean_base64 = image_base64.split("base64,")[1]

    clean_base64 = clean_base64.strip().replace("\n", "").replace("\r", "")

    api_key = settings.GEMINI_API_KEY
    if not api_key:
        return _make_empty_response("Gemini API key is not configured on the server.")

    prompt = (
        "You are an expert clinical nutrition AI. Analyze this image carefully.\n"
        "First, determine if the image actually contains real food, edible dishes, groceries, snacks, or beverages.\n"
        "If it is NOT food (e.g. blank screen, selfie, person, pet, animal, furniture, electronics, document, random object, blurry/unclear), "
        "set is_food to false and provide a clear, user-friendly error explaining what was detected instead of food.\n"
        "If it IS food, identify each food item or dish, estimate realistic portion sizes, calories, and macros (protein, carbs, fat in grams).\n"
        "Return STRICT JSON adhering to this schema:\n"
        "{\n"
        '  "is_food": boolean,\n'
        '  "error": string or null,\n'
        '  "food_items": [\n'
        "    {\n"
        '      "name": string,\n'
        '      "quantity": string,\n'
        '      "calories": number,\n'
        '      "protein_g": number,\n'
        '      "carbs_g": number,\n'
        '      "fat_g": number\n'
        "    }\n"
        "  ],\n"
        '  "total_calories": number,\n'
        '  "total_protein_g": number,\n'
        '  "total_carbs_g": number,\n'
        '  "total_fat_g": number,\n'
        '  "health_assessment": string,\n'
        '  "suggestions": [string]\n'
        "}"
    )

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt},
                    {
                        "inline_data": {
                            "mime_type": mime_type,
                            "data": clean_base64
                        }
                    }
                ]
            }
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    primary_model = settings.GEMINI_MODEL or "gemini-3.8-flash"
    models_to_try = [primary_model, "gemini-2.5-flash"]
    if "gemini-flash-latest" not in models_to_try:
        models_to_try.append("gemini-flash-latest")

    response = None
    last_error = ""

    for model_name in models_to_try:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            resp = requests.post(
                url,
                headers={"Content-Type": "application/json"},
                json=payload,
                timeout=25
            )
            if resp.ok:
                response = resp
                break
            else:
                last_error = f"{model_name}: {resp.status_code} {resp.text[:120]}"
        except Exception as net_err:
            last_error = f"{model_name}: {str(net_err)}"

    if response is None or not response.ok:
        return _make_empty_response(f"Image analysis service unavailable: {last_error}")

    try:
        res_json = response.json()
        candidates = res_json.get("candidates", [])
        if not candidates:
            return _make_empty_response("No recognition output received from vision model.")

        raw_text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "{}")
        parsed = json.loads(raw_text)

        is_food = bool(parsed.get("is_food", False))
        error_msg = parsed.get("error") if not is_food else None

        food_items = []
        if is_food:
            for item in parsed.get("food_items", []):
                food_items.append({
                    "name": item.get("name", "Unknown item"),
                    "quantity": item.get("quantity", "1 serving"),
                    "calories": round(float(item.get("calories", 0)), 1),
                    "proteinG": round(float(item.get("protein_g", 0)), 1),
                    "carbsG": round(float(item.get("carbs_g", 0)), 1),
                    "fatG": round(float(item.get("fat_g", 0)), 1),
                })

        total_calories = round(float(parsed.get("total_calories", sum(f["calories"] for f in food_items))), 1) if is_food else 0
        total_protein = round(float(parsed.get("total_protein_g", sum(f["proteinG"] for f in food_items))), 1) if is_food else 0
        total_carbs = round(float(parsed.get("total_carbs_g", sum(f["carbsG"] for f in food_items))), 1) if is_food else 0
        total_fat = round(float(parsed.get("total_fat_g", sum(f["fatG"] for f in food_items))), 1) if is_food else 0

        health_assessment = parsed.get("health_assessment", "") if is_food else "No food detected."
        suggestions = parsed.get("suggestions", []) if is_food else []

        return {
            "isFood": is_food,
            "is_food": is_food,
            "error": error_msg,
            "foodItems": food_items,
            "food_items": food_items,
            "totalCalories": total_calories,
            "total_calories": total_calories,
            "totalProteinG": total_protein,
            "total_protein_g": total_protein,
            "totalCarbsG": total_carbs,
            "total_carbs_g": total_carbs,
            "totalFatG": total_fat,
            "total_fat_g": total_fat,
            "healthAssessment": health_assessment,
            "health_assessment": health_assessment,
            "isEstimated": True,
            "is_estimated": True,
            "suggestions": suggestions,
            "disclaimer": DISCLAIMER_TEXT
        }

    except Exception as e:
        return _make_empty_response(f"Failed to parse image analysis: {str(e)}")


def _make_empty_response(error_message: str) -> Dict[str, Any]:
    return {
        "isFood": False,
        "is_food": False,
        "error": error_message,
        "foodItems": [],
        "food_items": [],
        "totalCalories": 0,
        "total_calories": 0,
        "totalProteinG": 0,
        "total_protein_g": 0,
        "totalCarbsG": 0,
        "total_carbs_g": 0,
        "totalFatG": 0,
        "total_fat_g": 0,
        "healthAssessment": "No food detected.",
        "health_assessment": "No food detected.",
        "isEstimated": True,
        "is_estimated": True,
        "suggestions": [],
        "disclaimer": DISCLAIMER_TEXT
    }
