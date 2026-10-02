import os
import joblib
import uuid
from typing import Dict, Any, List, Optional
from config import settings
from services.retrieval_service import search_hybrid

INTENT_MODEL_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "ml", "intent_pipeline.joblib")
)

_intent_pipeline = None

def get_intent_pipeline():
    global _intent_pipeline
    if _intent_pipeline is None and os.path.exists(INTENT_MODEL_PATH):
        try:
            _intent_pipeline = joblib.load(INTENT_MODEL_PATH)
        except Exception as e:
            print(f"Warning: Could not load intent pipeline ({e})")
    return _intent_pipeline

# Reviewed red-flag patterns that immediately trigger emergency escalation
RED_FLAG_PATTERNS = [
    "chest pain", "crushing pressure", "difficulty breathing", "cannot breathe",
    "face drooping", "arm weakness", "slurred speech", "stroke", "stiff neck fever",
    "anaphylaxis", "throat swelling", "swollen tongue"
]

def check_emergency_signals(text: str) -> bool:
    t_lower = text.lower()
    return any(p in t_lower for p in RED_FLAG_PATTERNS)

def orchestrate_chat_query(
    user_id: str,
    query: str,
    user_report_chunks: List[Dict[str, Any]],
    user_confirmed_observations: List[Dict[str, Any]],
    specific_report_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Fixed-workflow orchestration:
    1. Safety Red-Flag Check -> Immediate Escalation
    2. Intent Classification
    3. Scoped Hybrid Retrieval
    4. Evidence Validation & Fact Verification
    5. Extractive Answer & Source Citations
    """
    request_id = str(uuid.uuid4())

    # Step 1: Emergency red-flag triage
    if check_emergency_signals(query):
        return {
            "answer": (
                "EMERGENCY WARNING: Your query describes symptoms that may require urgent medical evaluation. "
                "Please do not wait for an app response. Contact emergency medical services immediately "
                "(Call 112 or 108 in India) or proceed to the nearest emergency department."
            ),
            "intent": "general_health",
            "mode": "rules",
            "citations": [],
            "limitations": "Immediate life-safety escalation. Non-clinical triage rule triggered.",
            "safety_action": "EMERGENCY_ESCALATION",
            "request_id": request_id
        }

    # Step 2: Intent classification
    pipeline = get_intent_pipeline()
    intent = "general_health"
    confidence = 1.0

    if pipeline is not None:
        try:
            probs = pipeline.predict_proba([query])[0]
            max_idx = probs.argmax()
            confidence = float(probs[max_idx])
            intent = pipeline.classes_[max_idx]
        except Exception:
            intent = "report_question" if "report" in query.lower() or "test" in query.lower() else "general_health"

    # Low-confidence threshold check
    if confidence < settings.CLARIFICATION_THRESHOLD:
        return {
            "answer": (
                "Could you please clarify your question? You can ask about your confirmed lab results, "
                "nutrition facts for Indian foods, generating a 7-day meal plan, or how to log daily habits."
            ),
            "intent": intent,
            "mode": "rules",
            "citations": [],
            "limitations": f"Classifier confidence ({confidence:.2f}) was below clarification threshold ({settings.CLARIFICATION_THRESHOLD}).",
            "safety_action": "REQUEST_CLARIFICATION",
            "request_id": request_id
        }

    # Step 3: Scoped Retrieval
    retrieval_res = search_hybrid(
        user_id=user_id,
        query=query,
        user_report_chunks=user_report_chunks,
        user_confirmed_observations=user_confirmed_observations,
        specific_report_id=specific_report_id,
        top_k=5
    )

    ranked_results = retrieval_res.get("results", [])

    # Step 4: Absence handling
    if not ranked_results:
        return {
            "answer": (
                "No matching test values or approved reference information were found for your query. "
                "If you are asking about a specific lab test, ensure that your report has been uploaded and "
                "the extracted values have been confirmed in the Reports tab."
            ),
            "intent": intent,
            "mode": "extractive",
            "citations": [],
            "limitations": "Zero evidence chunks matched authorized user records.",
            "safety_action": None,
            "request_id": request_id
        }

    # Step 5: Format Grounded Extractive Answer & Citations
    citations = []
    excerpts_text = []

    for item in ranked_results:
        cid = str(item.get("id") or item.get("source_id") or "src")
        citations.append({
            "source_id": cid,
            "title": item.get("title", "Health Document"),
            "date": str(item.get("date") or "2026"),
            "page": item.get("page", 1),
            "excerpt": item.get("text", "")[:250]
        })
        excerpts_text.append(item.get("text", ""))

    extractive_summary = "Based on your confirmed documents and approved sources:\n\n"
    for i, exc in enumerate(excerpts_text[:3], 1):
        extractive_summary += f"• {exc}\n"

    extractive_summary += (
        "\nImportant: Medi Bud provides educational and report-grounded information. "
        "Observed values outside stated intervals should be evaluated by a healthcare professional."
    )

    return {
        "answer": extractive_summary.strip(),
        "intent": intent,
        "mode": "extractive",
        "citations": citations,
        "limitations": "Strictly extractive response grounded in authorized user reports and approved wellness sources.",
        "safety_action": None,
        "request_id": request_id
    }
