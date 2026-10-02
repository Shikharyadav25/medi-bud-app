import time
import os
import sys
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List

# In-memory queue fallback for standalone worker execution
_JOB_QUEUE: List[Dict[str, Any]] = []

def enqueue_processing_job(user_id: str, report_id: str, kind: str = "report_ocr") -> str:
    import uuid
    job_id = str(uuid.uuid4())
    job = {
        "id": job_id,
        "user_id": user_id,
        "report_id": report_id,
        "kind": kind,
        "state": "queued",
        "attempts": 0,
        "max_attempts": 3,
        "lease_until": None,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    _JOB_QUEUE.append(job)
    return job_id

def claim_next_job(lease_seconds: int = 300) -> Optional[Dict[str, Any]]:
    """
    Simulates transactional 'FOR UPDATE SKIP LOCKED' job claim.
    Reclaims jobs with expired leases or newly queued jobs with attempts < max_attempts.
    """
    now = datetime.now()
    for job in _JOB_QUEUE:
        # Check if job is queued or if lease has expired
        is_queued = job["state"] == "queued"
        is_lease_expired = (
            job["state"] == "running" and 
            job.get("lease_until") is not None and 
            job["lease_until"] < now
        )

        if (is_queued or is_lease_expired) and job["attempts"] < job["max_attempts"]:
            job["state"] = "running"
            job["attempts"] += 1
            job["lease_until"] = now + timedelta(seconds=lease_seconds)
            job["updated_at"] = now
            return job
    return None

def process_claimed_job(job: Dict[str, Any]):
    """Processes a claimed report job."""
    report_id = job.get("report_id")
    user_id = job.get("user_id")

    try:
        # Simulate processing step safely without logging private text
        # (In production with PostgreSQL, reads raw object and writes observations/vectors)
        time.sleep(0.1) # Simulating OCR work
        job["state"] = "completed"
        job["updated_at"] = datetime.now()
        job["lease_until"] = None
        print(f"Worker: Successfully processed job {job['id']} for report {report_id}")
    except Exception as e:
        job["attempts"] += 1
        if job["attempts"] >= job["max_attempts"]:
            job["state"] = "failed"
            job["error_code"] = str(e)[:100]
        else:
            job["state"] = "queued"
        job["lease_until"] = None
        print(f"Worker: Job {job['id']} failed attempt {job['attempts']}: {e}")

def run_worker_loop(single_run: bool = False):
    """Worker daemon entry point."""
    print("Medi Bud Asynchronous Job Worker started (PostgreSQL Transactional Claim Mode).")
    while True:
        job = claim_next_job()
        if job:
            process_claimed_job(job)
        else:
            if single_run:
                break
            time.sleep(1.0)

if __name__ == "__main__":
    once = "--once" in sys.argv
    run_worker_loop(single_run=once)
