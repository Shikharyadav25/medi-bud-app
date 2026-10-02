from typing import List
from fastapi import APIRouter
from pydantic import BaseModel

symptom_router = APIRouter(prefix="/v1", tags=["Symptom Guidance"])

class SymptomGuidanceRequest(BaseModel):
    positive_question_ids: List[str]

EMERGENCY_CONTACTS = [
    {
        "label": "National Emergency Helpline",
        "number": "112",
        "description": "All-in-one emergency service across India (Police, Fire, Ambulance)",
        "source": "Ministry of Home Affairs, Govt. of India (ERSS)"
    },
    {
        "label": "Medical Ambulance Service",
        "number": "108",
        "description": "Emergency medical and disaster ambulance services",
        "source": "National Health Mission, MoHFW, Govt. of India"
    },
    {
        "label": "National Poison Information Centre",
        "number": "1800-116-117",
        "description": "Toll-free emergency toxicology guidance (AIIMS New Delhi)",
        "source": "AIIMS New Delhi"
    }
]

@symptom_router.post("/symptom-guidance")
async def evaluate_symptoms(req: SymptomGuidanceRequest):
    """
    Evaluates questionnaire answers against reviewed red-flag escalation rules.
    Never produces a clinical disease diagnosis or medication adjustment.
    """
    pos_ids = set(req.positive_question_ids)
    emergency_ids = {"rf_chest_pain", "rf_breathlessness", "rf_neuro_stroke", "rf_fever_stiff_neck", "rf_severe_anaphylaxis"}
    urgent_ids = {"urg_persistent_vomiting", "urg_high_fever_duration"}

    if pos_ids.intersection(emergency_ids):
        return {
            "level": "emergency",
            "headline": "Immediate Emergency Medical Attention Required",
            "guidance_text": (
                "Critical red-flag symptoms were identified. This requires immediate clinical evaluation "
                "at an emergency department. Do not delay seeking professional emergency care."
            ),
            "recommended_action": "Call 112 or 108 immediately or proceed to the nearest emergency hospital.",
            "emergency_contacts": EMERGENCY_CONTACTS,
            "matched_count": len(pos_ids.intersection(emergency_ids))
        }

    if pos_ids.intersection(urgent_ids):
        return {
            "level": "soon",
            "headline": "Consult a Healthcare Provider Within 24–48 Hours",
            "guidance_text": (
                "Your symptoms indicate persistent or moderate physiological distress that should be evaluated "
                "by a licensed physician or outpatient clinic."
            ),
            "recommended_action": "Schedule an in-person clinic appointment today.",
            "emergency_contacts": EMERGENCY_CONTACTS[:2],
            "matched_count": len(pos_ids.intersection(urgent_ids))
        }

    return {
        "level": "self_care",
        "headline": "Supportive Self-Care & Symptom Monitoring",
        "guidance_text": (
            "No immediate red-flag indicators were triggered. Maintain rest, balanced hydration, and monitor "
            "for any symptom changes. If symptoms worsen or new red flags develop, seek prompt medical care."
        ),
        "recommended_action": "Rest, hydrate, and re-evaluate if symptoms persist beyond 48 hours.",
        "emergency_contacts": EMERGENCY_CONTACTS[:1],
        "matched_count": 0
    }
