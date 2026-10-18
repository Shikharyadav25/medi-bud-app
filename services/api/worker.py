"""Durable report extraction worker. Inline uploads already process synchronously."""

import sys
import time
import uuid
from datetime import datetime, timedelta, timezone
from storage import DurableList, initialize, transaction

_JOB_QUEUE = DurableList("jobs")


def enqueue_processing_job(user_id, report_id, kind="report_ocr"):
    job_id = str(uuid.uuid4())
    _JOB_QUEUE.append(
        {
            "id": job_id,
            "user_id": user_id,
            "report_id": report_id,
            "kind": kind,
            "state": "queued",
            "attempts": 0,
            "max_attempts": 3,
            "lease_until": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    return job_id


def claim_next_job(lease_seconds=300):
    with transaction("worker-queue"):
        now = datetime.now(timezone.utc)
        for index, job in enumerate(_JOB_QUEUE):
            expired = (
                job["state"] == "running"
                and job.get("lease_until")
                and datetime.fromisoformat(job["lease_until"]) < now
            )
            if (job["state"] == "queued" or expired) and job["attempts"] < job[
                "max_attempts"
            ]:
                job.update(
                    state="running",
                    attempts=job["attempts"] + 1,
                    lease_until=(now + timedelta(seconds=lease_seconds)).isoformat(),
                )
                _JOB_QUEUE[index] = job
                return job
            if expired and job["attempts"] >= job["max_attempts"]:
                job.update(
                    state="failed", error_code="ATTEMPTS_EXHAUSTED", lease_until=None
                )
                _JOB_QUEUE[index] = job
    return None


def process_claimed_job(job):
    from routes.report_routes import (
        _USER_REPORTS,
        _USER_OBSERVATIONS,
        _REPORT_RAW_BYTES,
    )
    from parsers.report_parser import (
        extract_text_from_pdf,
        extract_observations_from_text,
    )
    from config import settings

    with transaction(job["user_id"]):
        try:
            report = _USER_REPORTS.get(job["report_id"])
            raw = _REPORT_RAW_BYTES.get(job["report_id"])
            if not report or report["user_id"] != job["user_id"] or not raw:
                raise ValueError("REPORT_UNAVAILABLE")
            if report["mime"] != "application/pdf":
                raise ValueError("OCR_UNAVAILABLE")
            observations = extract_observations_from_text(
                extract_text_from_pdf(raw, settings.MAX_PDF_PAGES)
            )
            _USER_OBSERVATIONS[job["report_id"]] = [
                {
                    **o,
                    "id": str(uuid.uuid4()),
                    "report_id": job["report_id"],
                    "user_id": job["user_id"],
                    "status": "proposed",
                }
                for o in observations
            ]
            report.update(status="review_needed", observations_count=len(observations))
            _USER_REPORTS[job["report_id"]] = report
            job.update(state="completed", lease_until=None)
        except ValueError:
            job.update(
                state="failed", error_code="REPORT_PROCESSING_FAILED", lease_until=None
            )
        for index, stored in enumerate(_JOB_QUEUE):
            if stored["id"] == job["id"]:
                _JOB_QUEUE[index] = job
                break


def run_worker_loop(single_run=False):
    initialize()
    while True:
        job = claim_next_job()
        if job:
            process_claimed_job(job)
        elif single_run:
            break
        else:
            time.sleep(1)


if __name__ == "__main__":
    run_worker_loop("--once" in sys.argv)
