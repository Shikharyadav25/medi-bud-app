import uuid
from datetime import datetime, timedelta
from worker import enqueue_processing_job, claim_next_job, _JOB_QUEUE

def test_vegetarian_plan_enforcement(client, user_a):
    res = client.post(
        "/v1/plans",
        headers=user_a["headers"],
        json={"is_veg": True, "allergens": []}
    )
    assert res.status_code == 200
    plan = res.json()
    assert len(plan["days"]) == 7

    for day in plan["days"]:
        assert len(day["meals"]) == 4
        for slot, meal in day["meals"].items():
            assert meal["is_veg"] is True, f"Non-veg item found in vegetarian plan: {meal['name']}"

def test_declared_allergen_exclusion(client, user_a):
    # Request plan excluding dairy and peanuts
    res = client.post(
        "/v1/plans",
        headers=user_a["headers"],
        json={"is_veg": True, "allergens": ["dairy", "peanuts"]}
    )
    assert res.status_code == 200
    plan = res.json()

    for day in plan["days"]:
        for slot, meal in day["meals"].items():
            allergens = [a.lower() for a in meal.get("allergens", [])]
            assert "dairy" not in allergens, f"Dairy allergen found in item: {meal['name']}"
            assert "peanuts" not in allergens, f"Peanut allergen found in item: {meal['name']}"

def test_meal_plan_pdf_export(client, user_a):
    # Generate plan
    res_plan = client.post(
        "/v1/plans",
        headers=user_a["headers"],
        json={"is_veg": True, "allergens": []}
    )
    plan_id = res_plan.json()["id"]

    # Download PDF
    pdf_res = client.get(f"/v1/plans/{plan_id}/pdf", headers=user_a["headers"])
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF"), "Generated file does not have valid PDF magic bytes"

def test_worker_transactional_claim_and_lease_recovery():
    user_id = str(uuid.uuid4())
    report_id = str(uuid.uuid4())

    job_id = enqueue_processing_job(user_id, report_id, kind="report_ocr")
    assert job_id is not None

    # Claim job
    job = claim_next_job(lease_seconds=60)
    assert job is not None
    assert job["id"] == job_id
    assert job["state"] == "running"
    assert job["attempts"] == 1

    # Second claim while lease is active should find nothing
    no_job = claim_next_job(lease_seconds=60)
    assert no_job is None

    # Simulate worker crash / lease expiry
    job["lease_until"] = datetime.now() - timedelta(seconds=10)

    # Re-claim should recover the orphaned job and increment attempts
    recovered_job = claim_next_job(lease_seconds=60)
    assert recovered_job is not None
    assert recovered_job["id"] == job_id
    assert recovered_job["attempts"] == 2
    assert recovered_job["state"] == "running"
