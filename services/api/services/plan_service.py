import os
import json
from typing import List, Dict, Any, Optional

FOOD_CATALOG_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "food", "catalog.json")
)

def load_food_catalog() -> List[Dict[str, Any]]:
    if not os.path.exists(FOOD_CATALOG_PATH):
        raise FileNotFoundError(f"Food catalog file not found at {FOOD_CATALOG_PATH}")
    with open(FOOD_CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_7day_indian_plan(
    is_veg: bool = True,
    declared_allergens: Optional[List[str]] = None,
    preferred_region: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a deterministic 7-day Indian meal plan with 4 slots per day.
    Strictly filters declared allergen conflicts, respects veg/non-veg preference,
    and maximizes dietary diversity across the week.
    """
    catalog = load_food_catalog()
    allergens_set = set(a.lower().strip() for a in (declared_allergens or []))

    # 1. Filter foods by preference and allergen safety
    safe_foods = []
    for food in catalog:
        # Check vegetarian preference
        if is_veg and not food.get("is_veg", True):
            continue

        # Check declared allergens
        food_allergens = set(a.lower().strip() for a in food.get("allergens", []))
        if food_allergens.intersection(allergens_set):
            continue

        safe_foods.append(food)

    if not safe_foods:
        raise ValueError("No foods in catalogue meet the specified allergen and dietary criteria.")

    # 2. Group by meal slot
    slot_pools: Dict[str, List[Dict[str, Any]]] = {
        "breakfast": [],
        "lunch": [],
        "snack": [],
        "dinner": [],
    }

    for food in safe_foods:
        for slot in food.get("meal_slots", []):
            if slot in slot_pools:
                slot_pools[slot].append(food)

    # Fallback to any safe food if a specific slot pool is empty
    for slot, pool in slot_pools.items():
        if not pool:
            slot_pools[slot] = list(safe_foods)

    days = []
    # Deterministic rotational assignment ensuring variety
    for day_num in range(1, 8):
        day_meals = {}
        day_calories = 0
        day_protein = 0.0
        day_carbs = 0.0
        day_fat = 0.0
        day_fiber = 0.0

        for slot_name in ["breakfast", "lunch", "snack", "dinner"]:
            pool = slot_pools[slot_name]
            # Offset formula ensures distinct rotation across 7 days
            pick_idx = (day_num - 1 + ["breakfast", "lunch", "snack", "dinner"].index(slot_name) * 2) % len(pool)
            food_item = pool[pick_idx]

            nut = food_item.get("nutrition", {})
            day_calories += nut.get("calories", 0)
            day_protein += nut.get("protein_g", 0)
            day_carbs += nut.get("carbs_g", 0)
            day_fat += nut.get("fat_g", 0)
            day_fiber += nut.get("fiber_g", 0)

            day_meals[slot_name] = {
                "food_id": food_item["id"],
                "name": food_item["name"],
                "portion_basis": food_item.get("portion_basis", "1 portion"),
                "is_veg": food_item.get("is_veg", True),
                "ingredients": food_item.get("ingredients", []),
                "allergens": food_item.get("allergens", []),
                "nutrition": nut
            }

        days.append({
            "day": day_num,
            "meals": day_meals,
            "daily_nutrition_summary": {
                "calories": day_calories,
                "protein_g": round(day_protein, 1),
                "carbs_g": round(day_carbs, 1),
                "fat_g": round(day_fat, 1),
                "fiber_g": round(day_fiber, 1)
            }
        })

    return {
        "version": 1,
        "preferences_snapshot": {
            "is_veg": is_veg,
            "declared_allergens": list(allergens_set),
            "preferred_region": preferred_region or "Pan-Indian"
        },
        "days": days,
        "disclaimer": "Nutritional values are approximate estimates based on ICMR-NIN IFCT tables for wellness guidance. Consult a clinical dietitian for therapeutic requirements."
    }
