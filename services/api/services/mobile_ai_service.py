import base64
import json
import uuid
from typing import Any, Dict, List, Optional

import requests

from config import settings
from parsers.report_parser import extract_observations_from_text, extract_text_from_pdf
from services.retrieval_service import load_knowledge_corpus, compute_lexical_score

DISCLAIMER = "Educational wellness guidance only—not a diagnosis or treatment. Verify important decisions with a qualified clinician."


def _gemini_json(prompt: str, inline_data: Optional[Dict[str, str]] = None) -> Optional[Dict[str, Any]]:
    if not settings.GEMINI_API_KEY:
        return None
    parts: List[Dict[str, Any]] = [{"text": prompt}]
    if inline_data:
        parts.append({"inline_data": inline_data})
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseMimeType": "application/json", "temperature": 0.2},
    }
    candidates = [settings.GEMINI_MODEL, "gemini-2.5-flash", "gemini-flash-latest"]
    for model in dict.fromkeys(candidates):
        try:
            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={settings.GEMINI_API_KEY}",
                json=payload,
                headers={"Content-Type": "application/json"},
                timeout=35,
            )
            if not response.ok:
                continue
            text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(text)
        except (KeyError, IndexError, json.JSONDecodeError, requests.RequestException):
            continue
    return None


def grounded_mobile_chat(query: str, profile: Dict[str, Any], vitals: Dict[str, Any], activity: Dict[str, Any], reports: List[Dict[str, Any]]) -> Dict[str, Any]:
    query_lower = query.lower()
    emergency_terms = ["chest pain", "can't breathe", "cannot breathe", "face drooping", "slurred speech", "unconscious", "severe bleeding"]
    if any(term in query_lower for term in emergency_terms):
        return {
            "response": "This may be an emergency. Call 112 or 108 in India now, or go to the nearest emergency department. Do not wait for an app response.",
            "citations": ["Medi Bud reviewed emergency escalation rules"],
            "action": "EMERGENCY",
            "disclaimer": DISCLAIMER,
        }

    knowledge = sorted(load_knowledge_corpus(), key=lambda item: compute_lexical_score(query, item.get("text", "")), reverse=True)[:3]
    evidence: List[Dict[str, str]] = []
    for item in knowledge:
        if compute_lexical_score(query, item.get("text", "")) > 0:
            evidence.append({"label": item.get("source_title", "Approved health source"), "text": item.get("text", "")})
    for report in reports[:3]:
        tests = "; ".join(
            f"{test.get('testName')}: {test.get('value')} {test.get('unit')} (range {test.get('referenceRange')}, status {test.get('status')})"
            for test in report.get("testResults", [])[:12]
        )
        if tests:
            evidence.append({"label": report.get("title", "User medical report"), "text": tests})

    context = {
        "profile": {k: profile.get(k) for k in ("age", "gender", "heightCm", "weightKg", "bmi", "healthGoals", "dietaryPreferences", "allergies", "medicalConditions")},
        "today": {"vitals": vitals, "activity": activity},
        "evidence": evidence,
    }
    prompt = (
        "You are Medi Bud, a cautious wellness assistant. Answer the user's question using ONLY the JSON context below. "
        "Never diagnose, prescribe, invent a test value, or claim certainty. If context is insufficient, clearly say what is missing. "
        "Keep the response actionable and under 170 words. Return strict JSON with response (string), cited_labels (string array), and action "
        "(one of SELF_CARE, MONITOR, SEE_DOCTOR_SOON).\n"
        f"USER QUESTION: {query}\nCONTEXT: {json.dumps(context, ensure_ascii=False)}"
    )
    result = _gemini_json(prompt)
    if result and result.get("response"):
        allowed = {item["label"] for item in evidence}
        cited = [str(label) for label in result.get("cited_labels", []) if str(label) in allowed]
        return {"response": str(result["response"]), "citations": cited, "action": result.get("action", "SELF_CARE"), "disclaimer": DISCLAIMER}

    name = profile.get("name") or "there"
    water = activity.get("waterIntakeMl", 0)
    goal = activity.get("waterGoalMl", 2500)
    if evidence:
        excerpt = evidence[0]["text"]
        return {"response": f"Hi {name}. Based on the available context: {excerpt} Your logged water today is {water} ml against a {goal} ml goal. I can explain a specific confirmed result, meal, or habit if you ask one focused question.", "citations": [evidence[0]["label"]], "action": "MONITOR", "disclaimer": DISCLAIMER}
    return {"response": "I don’t have enough relevant, verified context to answer that safely. Add a specific symptom, log, or medical report and try again.", "citations": [], "action": "MONITOR", "disclaimer": DISCLAIMER}


def analyze_medical_document(data_base64: str, mime_type: str, filename: str, document_text: str = "") -> Dict[str, Any]:
    inline = None
    raw = b""
    if data_base64:
        try:
            raw = base64.b64decode(data_base64, validate=True)
        except Exception:
            return {"isMedicalReport": False, "error": "The selected file could not be decoded. Please choose a valid PDF, JPG, or PNG."}
        if len(raw) > settings.MAX_UPLOAD_SIZE_BYTES:
            return {"isMedicalReport": False, "error": "The file is larger than the 10 MB upload limit."}
        valid = raw.startswith(b"%PDF") or raw.startswith(b"\x89PNG") or raw.startswith(b"\xff\xd8\xff")
        if not valid:
            return {"isMedicalReport": False, "error": "This is not a valid PDF, PNG, or JPEG medical document."}
        inline = {"mime_type": mime_type or "application/pdf", "data": data_base64}
    elif document_text.strip():
        tokens = ("hemoglobin", "cholesterol", "glucose", "patient", "reference range", "laboratory", "prescription", "radiology")
        if not any(token in document_text.lower() for token in tokens):
            return {"isMedicalReport": False, "error": "The content does not look like a medical report."}
    else:
        return {"isMedicalReport": False, "error": "No report data was received."}

    prompt = (
        "Inspect this file. Accept it only if it is a genuine-looking medical report, lab result, prescription, discharge summary, or diagnostic imaging report. "
        "Reject food photos, selfies, pets, scenery, screenshots without clinical content, blank/unreadable pages, bills, and unrelated documents. "
        "Do not invent unreadable values. Return strict JSON: {is_medical_report:boolean,error:string|null,report_type:string,title:string,"
        "date:string,provider:string|null,tests:[{name:string,value:string,unit:string,reference_range:string,status:NORMAL|LOW|HIGH|ABNORMAL}],"
        "plain_language_summary:string,lifestyle_recommendations:[string],questions_for_doctor:[string],raw_text_preview:string}."
    )
    if document_text:
        prompt += f"\nDocument text:\n{document_text[:12000]}"
    result = _gemini_json(prompt, inline)
    if not result:
        pages = [(1, document_text)] if document_text.strip() else []
        if raw.startswith(b"%PDF"):
            try:
                pages = extract_text_from_pdf(raw, max_pages=settings.MAX_PDF_PAGES)
            except ValueError as exc:
                return {"isMedicalReport": False, "error": str(exc)}
        observations = extract_observations_from_text(pages)
        if observations:
            tests = []
            for item in observations:
                outside = item.get("is_outside_stated_interval")
                tests.append({
                    "testName": item.get("canonical_test", "Unlabeled test"), "value": item.get("value_text", ""),
                    "unit": item.get("unit", ""), "referenceRange": item.get("reference_text") or "Not shown",
                    "status": "ABNORMAL" if outside else "NORMAL" if outside is False else "ABNORMAL",
                })
            report = {
                "id": f"report-{uuid.uuid4()}", "userId": "mobile-user", "title": filename, "reportType": "Pathology",
                "date": "Date not detected", "testResults": tests,
                "aiExplanation": "Values were extracted locally because the generative AI provider was unavailable. Review every value against the original report before relying on it.",
                "lifestyleRecommendations": ["Discuss values marked abnormal or without a stated range with a qualified clinician."],
                "questionsForDoctor": ["Which results need follow-up in the context of my medical history?"],
                "rawTextPreview": " ".join(text for _, text in pages)[:600], "chunksIndexed": len(tests),
            }
            return {"isMedicalReport": True, "report": report, "processingMode": "local_extractive_fallback"}
        return {"isMedicalReport": False, "error": "The AI validator is unavailable and no supported lab values could be extracted locally. Try again when Gemini quota is available."}
    if not result.get("is_medical_report"):
        return {"isMedicalReport": False, "error": result.get("error") or "No recognizable medical report was found in this file."}

    tests = []
    for test in result.get("tests", []):
        status = str(test.get("status", "ABNORMAL")).upper()
        if status not in {"NORMAL", "LOW", "HIGH", "ABNORMAL"}:
            status = "ABNORMAL"
        tests.append({"testName": test.get("name", "Unlabeled test"), "value": str(test.get("value", "")), "unit": str(test.get("unit", "")), "referenceRange": str(test.get("reference_range", "Not shown")), "status": status})
    return {
        "isMedicalReport": True,
        "report": {
            "id": f"report-{uuid.uuid4()}", "userId": "mobile-user", "title": result.get("title") or filename,
            "reportType": result.get("report_type") if result.get("report_type") in {"Pathology", "Radiology", "Prescription", "Cardiology", "Other"} else "Other",
            "date": result.get("date") or "Date not detected", "doctorOrLabName": result.get("provider"), "testResults": tests,
            "aiExplanation": result.get("plain_language_summary") or "Review the extracted values with a qualified clinician.",
            "lifestyleRecommendations": result.get("lifestyle_recommendations", []), "questionsForDoctor": result.get("questions_for_doctor", []),
            "rawTextPreview": result.get("raw_text_preview", ""), "chunksIndexed": max(1, len(tests)),
        },
    }
