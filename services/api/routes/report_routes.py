import uuid
import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status, Response, Query, Header
from pydantic import BaseModel
from auth import get_current_user, AuthenticatedUser, verify_token
from parsers.report_parser import validate_file_signature, extract_text_from_pdf, extract_observations_from_text
from services.embedding_service import chunk_document_text

report_router = APIRouter(prefix="/v1/reports", tags=["Lab Reports"])

_USER_REPORTS: Dict[str, Dict[str, Any]] = {}
_USER_OBSERVATIONS: Dict[str, List[Dict[str, Any]]] = {}
_USER_CHUNKS: Dict[str, List[Dict[str, Any]]] = {}
_REPORT_RAW_BYTES: Dict[str, bytes] = {}

# Seed initial demonstration data for local development showcase
_DEMO_UID = "00000000-0000-0000-0000-000000000001"
_DEMO_RID = "rep-fixture-lipid"
_USER_REPORTS[_DEMO_RID] = {
    "id": _DEMO_RID,
    "user_id": _DEMO_UID,
    "object_key": "reports/demo_lipid.pdf",
    "filename": "Lipid_Panel_Sept2026.pdf",
    "mime": "application/pdf",
    "checksum": "demo_sha256_hash_1",
    "report_date": "2026-09-28",
    "status": "review_needed",
    "created_at": datetime.now().isoformat(),
    "observations_count": 3
}
_USER_OBSERVATIONS[_DEMO_RID] = [
    {
        "id": "obs-1",
        "report_id": _DEMO_RID,
        "user_id": _DEMO_UID,
        "original_label": "Total Cholesterol",
        "canonical_test": "Total Cholesterol",
        "value_text": "228",
        "numeric_value": 228.0,
        "comparator": None,
        "unit": "mg/dL",
        "reference_text": "< 200 mg/dL",
        "bounds_low": None,
        "bounds_high": 200.0,
        "status": "proposed",
        "page": 1
    },
    {
        "id": "obs-2",
        "report_id": _DEMO_RID,
        "user_id": _DEMO_UID,
        "original_label": "LDL Cholesterol",
        "canonical_test": "LDL Cholesterol",
        "value_text": "148",
        "numeric_value": 148.0,
        "comparator": None,
        "unit": "mg/dL",
        "reference_text": "< 100 mg/dL",
        "bounds_low": None,
        "bounds_high": 100.0,
        "status": "proposed",
        "page": 1
    },
    {
        "id": "obs-3",
        "report_id": _DEMO_RID,
        "user_id": _DEMO_UID,
        "original_label": "HDL Cholesterol",
        "canonical_test": "HDL Cholesterol",
        "value_text": "44",
        "numeric_value": 44.0,
        "comparator": None,
        "unit": "mg/dL",
        "reference_text": "> 40 mg/dL",
        "bounds_low": 40.0,
        "bounds_high": None,
        "status": "confirmed",
        "page": 1
    }
]
_lipid_demo_text = "Lipid Profile Panel. Total Cholesterol: 228 mg/dL (Desirable: < 200). LDL Cholesterol: 148 mg/dL (Optimal: < 100). HDL Cholesterol: 44 mg/dL (> 40)."
_USER_CHUNKS[_DEMO_RID] = [
    {
        **c,
        "id": str(uuid.uuid4()),
        "report_id": _DEMO_RID,
        "user_id": _DEMO_UID
    }
    for c in chunk_document_text([{"page": 1, "text": _lipid_demo_text}])
]

class ObservationUpdateRequest(BaseModel):
    observations: List[Dict[str, Any]]

@report_router.post("")
async def upload_report(
    file: UploadFile = File(...),
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    content = await file.read()
    
    try:
        mime = validate_file_signature(content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FILE", "message": str(e)}
        )

    report_id = str(uuid.uuid4())
    checksum = hashlib.sha256(content).hexdigest()
    _REPORT_RAW_BYTES[report_id] = content

    # Process text extraction
    pages = []
    if mime == "application/pdf":
        try:
            pages = extract_text_from_pdf(content, max_pages=20)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "PAGE_LIMIT_EXCEEDED", "message": str(e)}
            )
    else:
        # Fallback raw text placeholder for image / OCR demo
        pages = [(1, "Demonstration image upload. Pathology report panel.")]

    # Normalizer for CBC, Glucose, and Lipid observations
    extracted_obs = extract_observations_from_text(pages)
    for obs in extracted_obs:
        obs["id"] = str(uuid.uuid4())
        obs["report_id"] = report_id
        obs["user_id"] = user_id
        obs["status"] = "proposed"

    _USER_OBSERVATIONS[report_id] = extracted_obs

    # Generate persistent vector chunks
    chunks_input = [{"page": p[0], "text": p[1]} for p in pages]
    chunks = chunk_document_text(chunks_input)
    for c in chunks:
        c["report_id"] = report_id
        c["user_id"] = user_id

    _USER_CHUNKS[report_id] = chunks

    report_record = {
        "id": report_id,
        "user_id": user_id,
        "object_key": f"reports/{user_id}/{report_id}_{file.filename}",
        "filename": file.filename or "report.pdf",
        "mime": mime,
        "checksum": checksum,
        "report_date": datetime.now().strftime("%Y-%m-%d"),
        "status": "review_needed" if extracted_obs else "ready",
        "created_at": datetime.now().isoformat(),
        "observations_count": len(extracted_obs)
    }

    _USER_REPORTS[report_id] = report_record
    return {"report_id": report_id, "status": report_record["status"]}

@report_router.get("")
async def list_reports(current_user: AuthenticatedUser = Depends(get_current_user)):
    user_id = current_user.user_id
    user_reports = [r for r in _USER_REPORTS.values() if r["user_id"] == user_id]
    user_reports.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    return user_reports

@report_router.get("/{report_id}")
async def get_report(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"}
        )
    
    obs = _USER_OBSERVATIONS.get(report_id, [])
    return {**report, "observations": obs}

@report_router.patch("/{report_id}/observations")
async def review_observations(
    report_id: str,
    data: ObservationUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"}
        )

    current_obs = _USER_OBSERVATIONS.get(report_id, [])
    update_map = {item.get("id"): item for item in data.observations if item.get("id")}

    for obs in current_obs:
        obs_id = obs.get("id")
        if obs_id in update_map:
            patch = update_map[obs_id]
            if "status" in patch:
                obs["status"] = patch["status"]
            if "numeric_value" in patch:
                obs["numeric_value"] = patch["numeric_value"]
            if "value_text" in patch:
                obs["value_text"] = patch["value_text"]

    # If any observations were confirmed, set report status to ready
    has_confirmed = any(o.get("status") == "confirmed" for o in current_obs)
    if has_confirmed:
        report["status"] = "ready"

    return current_obs

@report_router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"}
        )

    _USER_REPORTS.pop(report_id, None)
    _USER_OBSERVATIONS.pop(report_id, None)
    _USER_CHUNKS.pop(report_id, None)
    _REPORT_RAW_BYTES.pop(report_id, None)
    return {"message": "Report, extracted observations, and vectors deleted successfully."}

@report_router.get("/{report_id}/download")
async def download_report_file(
    report_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"}
        )
    return {"download_url": f"/v1/reports/{report_id}/file", "filename": report.get("filename")}

@report_router.get("/{report_id}/file")
async def get_report_file(
    report_id: str,
    token: Optional[str] = Query(None),
    authorization: Optional[str] = Header(None)
):
    auth_token = None
    if authorization and authorization.startswith("Bearer "):
        auth_token = authorization.split("Bearer ")[1].strip()
    elif token:
        auth_token = token

    if not auth_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "UNAUTHORIZED", "message": "Missing Authorization header or token query parameter"}
        )

    current_user = verify_token(auth_token)
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"}
        )

    raw_bytes = _REPORT_RAW_BYTES.get(report_id)
    if not raw_bytes:
        # Default placeholder PDF bytes for pre-seeded demonstration reports
        raw_bytes = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"

    return Response(
        content=raw_bytes,
        media_type=report.get("mime", "application/pdf"),
        headers={"Content-Disposition": f"inline; filename={report.get('filename', 'report.pdf')}"}
    )
