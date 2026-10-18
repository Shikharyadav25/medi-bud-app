import os
import json
from typing import List, Dict, Any, Optional

FOOD_CATALOG_PATH = os.path.abspath(
    os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "data", "food", "catalog.json"
    )
)


def load_food_catalog() -> List[Dict[str, Any]]:
    if not os.path.exists(FOOD_CATALOG_PATH):
        raise FileNotFoundError(f"Food catalog file not found at {FOOD_CATALOG_PATH}")
    with open(FOOD_CATALOG_PATH, "r", encoding="utf-8") as f:
        return json.load(f)


def generate_7day_indian_plan(
    is_veg: bool = True,
    declared_allergens: Optional[List[str]] = None,
    preferred_region: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Generates a deterministic 7-day Indian meal plan with 4 slots per day.
    Strictly filters declared allergen conflicts, respects veg/non-veg preference,
    and maximizes dietary diversity across the week.
    """
    catalog = load_food_catalog()
    aliases = {
        "milk": "dairy",
        "lactose": "dairy",
        "peanut": "peanuts",
        "tree nuts": "tree_nuts",
        "nuts": "tree_nuts",
        "wheat": "gluten",
        "egg": "eggs",
        "soya": "soy",
    }
    allergens_set = {
        aliases.get(str(a).lower().strip(), str(a).lower().strip())
        for a in (declared_allergens or [])
    }
    supported = {
        "dairy",
        "peanuts",
        "tree_nuts",
        "gluten",
        "soy",
        "mustard",
        "sesame",
        "eggs",
        "fish",
        "shellfish",
    }
    if allergens_set - supported:
        raise ValueError(
            "Some declared allergies cannot be matched safely to this catalogue. Review your preferences with a dietitian."
        )

    # 1. Filter foods by preference and allergen safety
    safe_foods = []
    for food in catalog:
        # Check vegetarian preference
        if is_veg and not food.get("is_veg", True):
            continue

        # Check declared allergens
        food_allergens = set(a.lower().strip() for a in food.get("allergens", []))
        ingredients = " ".join(food.get("ingredients", [])).lower()
        signals = {
            "dairy": ["milk", "paneer", "curd", "yogurt", "ghee", "butter", "cheese"],
            "peanuts": ["peanut"],
            "tree_nuts": ["almond", "cashew", "walnut", "pistachio"],
            "gluten": ["wheat", "semolina", "suji", "maida", "barley"],
            "soy": ["soy", "tofu"],
            "mustard": ["mustard"],
            "sesame": ["sesame"],
            "eggs": ["whole egg", "egg white"],
            "fish": ["fish"],
            "shellfish": ["shrimp", "prawn", "crab"],
        }
        food_allergens.update(
            allergen
            for allergen, words in signals.items()
            if any(word in ingredients for word in words)
        )
        if food_allergens.intersection(allergens_set):
            continue

        safe_foods.append({**food, "allergens": sorted(food_allergens)})

    if not safe_foods:
        raise ValueError(
            "No foods in catalogue meet the specified allergen and dietary criteria."
        )
    if preferred_region and preferred_region != "Pan-Indian":
        safe_foods.sort(
            key=lambda f: (
                f.get("region") != preferred_region,
                f.get("region") != "Pan-Indian",
            )
        )

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
            raise ValueError(
                "The catalogue cannot cover every meal slot with these exclusions. Consult a dietitian for more options."
            )

    # A side dish or soup must never be presented as a whole lunch or dinner.
    staple_ids = {"food_12", "food_13", "food_18", "food_34", "food_40"}
    protein_ids = {
        "food_11",
        "food_14",
        "food_15",
        "food_16",
        "food_17",
        "food_20",
        "food_23",
        "food_36",
        "food_38",
        "food_39",
    }
    vegetable_ids = {"food_19", "food_24", "food_30", "food_35"}
    groups = [
        [f for f in safe_foods if f["id"] in ids]
        for ids in (staple_ids, protein_ids, vegetable_ids)
    ]
    if any(not group for group in groups):
        raise ValueError(
            "These exclusions leave too few ingredients for meal combinations. Consult a dietitian for suitable meals."
        )
    combinations = []
    for index in range(7):
        components = [group[index % len(group)] for group in groups]
        nutrition = {
            key: round(sum(f["nutrition"].get(key, 0) for f in components), 1)
            for key in ("calories", "protein_g", "carbs_g", "fat_g", "fiber_g")
        }
        combinations.append(
            {
                "id": "combo_" + "_".join(f["id"] for f in components),
                "name": " + ".join(f["name"] for f in components),
                "portion_basis": "; ".join(f["portion_basis"] for f in components),
                "is_veg": all(f["is_veg"] for f in components),
                "ingredients": sorted(
                    {x for f in components for x in f["ingredients"]}
                ),
                "allergens": sorted({x for f in components for x in f["allergens"]}),
                "nutrition": nutrition,
            }
        )
    slot_pools["lunch"] = combinations
    slot_pools["dinner"] = combinations[3:] + combinations[:3]

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
            pick_idx = (
                day_num
                - 1
                + ["breakfast", "lunch", "snack", "dinner"].index(slot_name) * 2
            ) % len(pool)
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
                "nutrition": nut,
            }

        days.append(
            {
                "day": day_num,
                "meals": day_meals,
                "daily_nutrition_summary": {
                    "calories": day_calories,
                    "protein_g": round(day_protein, 1),
                    "carbs_g": round(day_carbs, 1),
                    "fat_g": round(day_fat, 1),
                    "fiber_g": round(day_fiber, 1),
                },
            }
        )

    return {
        "version": 1,
        "preferences_snapshot": {
            "is_veg": is_veg,
            "declared_allergens": list(allergens_set),
            "preferred_region": preferred_region or "Pan-Indian",
        },
        "days": days,
        "disclaimer": "Illustrative meal ideas with approximate catalogue nutrition; not a complete or therapeutic diet or a prescribed calorie target. Ingredient and allergen lists may be incomplete, and cross-contact cannot be assessed. Verify ingredients and consult a dietitian for food allergies or medical dietary needs.",
    }
