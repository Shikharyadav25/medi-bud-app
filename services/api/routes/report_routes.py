import uuid
import hashlib
from datetime import datetime
from typing import List, Optional
from fastapi import (
    APIRouter,
    Depends,
    UploadFile,
    File,
    Form,
    HTTPException,
    status,
    Response,
)
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal
import base64
import re
from services.mobile_ai_service import analyze_medical_document
from starlette.concurrency import run_in_threadpool
from auth import get_current_user, AuthenticatedUser, require_ai_budget
from parsers.report_parser import (
    validate_file_signature,
    extract_text_from_pdf,
    extract_observations_from_text,
)
from services.embedding_service import chunk_document_text
from storage import DurableMap
from config import settings

report_router = APIRouter(prefix="/v1/reports", tags=["Lab Reports"])

_USER_REPORTS = DurableMap("reports")
_USER_OBSERVATIONS = DurableMap("observations")
_USER_CHUNKS = DurableMap("chunks")
_REPORT_RAW_BYTES = DurableMap("report_files")


class ObservationPatch(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    id: str
    status: Literal["confirmed", "rejected"]
    numeric_value: Optional[float] = None
    value_text: Optional[str] = Field(default=None, max_length=100)


class ObservationUpdateRequest(BaseModel):
    observations: List[ObservationPatch] = Field(max_length=500)


@report_router.post("")
async def upload_report(
    file: UploadFile = File(...),
    consent_ai: bool = Form(False),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    user_id = current_user.user_id
    if (
        sum(r["user_id"] == user_id for r in _USER_REPORTS.values())
        >= settings.MAX_REPORTS_PER_USER
    ):
        raise HTTPException(
            409,
            detail="Report storage limit reached. Export or remove older reports before uploading more.",
        )
    content = await file.read(settings.MAX_UPLOAD_SIZE_BYTES + 1)

    try:
        mime = validate_file_signature(content)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_FILE", "message": str(e)},
        )

    report_id = str(uuid.uuid4())
    checksum = hashlib.sha256(content).hexdigest()

    # Process text extraction
    pages = []
    ai_observations = None
    if mime == "application/pdf":
        try:
            pages = extract_text_from_pdf(content, max_pages=20)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"code": "PAGE_LIMIT_EXCEEDED", "message": str(e)},
            )
    else:
        await require_ai_budget(current_user)
        if not consent_ai:
            raise HTTPException(
                422,
                detail="Image extraction needs your consent to send the file to Google Gemini.",
            )
        result = await run_in_threadpool(
            analyze_medical_document,
            base64.b64encode(content).decode(),
            mime,
            file.filename or "Report image",
            "",
            True,
        )
        if not result.get("report"):
            raise HTTPException(
                422,
                detail=result.get("error")
                or "Image extraction is unavailable. Try a text-based PDF.",
            )
        ai_observations = []
        for test in result["report"].get("testResults", []):
            value = str(test.get("value", ""))[:100]
            ai_observations.append(
                {
                    "original_label": str(test.get("testName", "Test"))[:120],
                    "canonical_test": str(test.get("testName", "Test"))[:120],
                    "value_text": value,
                    "numeric_value": float(value)
                    if re.fullmatch(r"-?\d+(?:\.\d+)?", value)
                    else None,
                    "unit": str(test.get("unit", ""))[:50],
                    "reference_text": str(test.get("referenceRange", ""))[:200],
                    "page": 1,
                    "comparator": None,
                    "bounds_low": None,
                    "bounds_high": None,
                }
            )

    # Normalizer for CBC, Glucose, and Lipid observations
    extracted_obs = (
        ai_observations
        if ai_observations is not None
        else extract_observations_from_text(pages)
    )
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
        "object_key": f"{user_id}/{report_id}",
        "filename": (file.filename or "report.pdf")[:200],
        "mime": mime,
        "checksum": checksum,
        "report_date": None,
        "status": "review_needed",
        "created_at": datetime.now().isoformat(),
        "observations_count": len(extracted_obs),
    }

    _REPORT_RAW_BYTES[report_id] = content
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
    report_id: str, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"},
        )

    obs = _USER_OBSERVATIONS.get(report_id, [])
    return {**report, "observations": obs}


@report_router.patch("/{report_id}/observations")
async def review_observations(
    report_id: str,
    data: ObservationUpdateRequest,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"},
        )

    current_obs = _USER_OBSERVATIONS.get(report_id, [])
    update_map = {
        item.id: item.model_dump(exclude_unset=True) for item in data.observations
    }
    if not set(update_map).issubset({o["id"] for o in current_obs}):
        raise HTTPException(422, detail="Unknown observation ID")

    for obs in current_obs:
        obs_id = obs.get("id")
        if obs_id in update_map:
            patch = update_map[obs_id]
            if "status" in patch:
                obs["status"] = patch["status"]
            if "numeric_value" in patch:
                obs["numeric_value"] = patch["numeric_value"]
                if "value_text" not in patch and patch["numeric_value"] is not None:
                    obs["value_text"] = str(patch["numeric_value"])
            if "value_text" in patch:
                obs["value_text"] = patch["value_text"]
            if "numeric_value" in patch or "value_text" in patch:
                obs["is_outside_stated_interval"] = None
                value = str(obs.get("value_text", ""))
                obs["comparator"] = None
                obs["numeric_value"] = (
                    float(value) if re.fullmatch(r"-?\d+(?:\.\d+)?", value) else None
                )

    # If any observations were confirmed, set report status to ready
    has_confirmed = any(o.get("status") == "confirmed" for o in current_obs)
    if has_confirmed:
        report["status"] = "ready"

    _USER_OBSERVATIONS[report_id] = current_obs
    report["status"] = (
        "ready"
        if current_obs
        and all(o.get("status") in ("confirmed", "rejected") for o in current_obs)
        else "review_needed"
    )
    _USER_REPORTS[report_id] = report
    return current_obs


@report_router.delete("/{report_id}")
async def delete_report(
    report_id: str, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"},
        )

    _USER_REPORTS.pop(report_id, None)
    _USER_OBSERVATIONS.pop(report_id, None)
    _USER_CHUNKS.pop(report_id, None)
    _REPORT_RAW_BYTES.pop(report_id, None)
    return {
        "message": "Report, extracted observations, and vectors deleted successfully."
    }


@report_router.get("/{report_id}/download")
async def download_report_file(
    report_id: str, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"},
        )
    return {
        "download_url": f"/v1/reports/{report_id}/file",
        "filename": report.get("filename"),
    }


@report_router.get("/{report_id}/file")
async def get_report_file(
    report_id: str, current_user: AuthenticatedUser = Depends(get_current_user)
):
    user_id = current_user.user_id
    report = _USER_REPORTS.get(report_id)
    if not report or report.get("user_id") != user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Report not found or unauthorized"},
        )

    raw_bytes = _REPORT_RAW_BYTES.get(report_id)
    if not raw_bytes:
        raise HTTPException(404, detail="Original report file is unavailable")

    return Response(
        content=raw_bytes,
        media_type=report.get("mime", "application/pdf"),
        headers={"Content-Disposition": 'attachment; filename="report.pdf"'},
    )
