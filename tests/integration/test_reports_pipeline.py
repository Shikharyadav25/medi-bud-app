import io
import uuid
import pytest
from parsers.report_parser import validate_file_signature, extract_observations_from_text

# Synthetic report fixtures
FIXTURE_CBC = """
METROPOLIS DIAGNOSTIC CENTRE - SYNTHETIC REPORT
Patient Name: Demo User A
Age: 22 Y / Male
Date: 15-Sep-2026

COMPLETE BLOOD COUNT (CBC)
Investigation                  Result    Unit      Biological Ref. Interval
Hemoglobin                     14.5      g/dL      13.0 - 17.0
Total Leukocyte Count (WBC)    7500      /cumm     4000 - 11000
Platelet Count                 250000    /cumm     150000 - 450000
RBC Count                      5.1       mil/uL    4.5 - 5.5
"""

FIXTURE_LIPID = """
APOLLO CLINIC PATHOLOGY - SYNTHETIC REPORT
LIPID PROFILE PANEL
Test Name                      Observed  Units     Reference Range
Total Cholesterol              210       mg/dL     < 200 (Desirable)
Triglycerides                  165       mg/dL     < 150 (Normal)
HDL Cholesterol                42        mg/dL     > 40 (Normal)
LDL Cholesterol                135       mg/dL     < 100 (Optimal)
VLDL Cholesterol               33        mg/dL     < 30 (Normal)
"""

FIXTURE_GLUCOSE = """
HEALTHQUEST LABS - SYNTHETIC REPORT
DIABETES MONITORING PANEL
Test                           Value     Unit      Reference
Fasting Blood Sugar            118       mg/dL     70 - 99
HbA1c                          6.2       %         4.0 - 5.6
"""

FIXTURE_COMPARATOR = """
PATHCARE ADVANCED - SYNTHETIC REPORT
SPECIALIZED TESTS
High Sensitivity CRP           < 0.5     mg/L      Reference: < 1.0 mg/L
"""

FIXTURE_CORRUPT = """
!@#$%^&*()_+~`|}{[]:;"'<>?,./
UNREADABLE GARBAGE DATA ONLY
"""

def test_file_signature_validation():
    # PDF
    assert validate_file_signature(b"%PDF-1.7\n...") == "application/pdf"
    # PNG
    assert validate_file_signature(b"\x89PNG\r\n\x1a\n...") == "image/png"
    # JPEG
    assert validate_file_signature(b"\xff\xd8\xff\xe0...") == "image/jpeg"

    # Invalid signature
    with pytest.raises(ValueError) as excinfo:
        validate_file_signature(b"Plain text file content...")
    assert "Invalid file signature" in str(excinfo.value)

def test_synthetic_fixture_cbc_extraction():
    pages = [(1, FIXTURE_CBC)]
    obs = extract_observations_from_text(pages)
    tests = {o["canonical_test"]: o for o in obs}

    assert "hemoglobin" in tests
    assert tests["hemoglobin"]["numeric_value"] == 14.5
    assert tests["hemoglobin"]["unit"] == "g/dL"
    assert tests["hemoglobin"]["bounds_low"] == 13.0
    assert tests["hemoglobin"]["bounds_high"] == 17.0

    assert "platelet_count" in tests
    assert tests["platelet_count"]["numeric_value"] == 250000

def test_synthetic_fixture_lipid_extraction():
    pages = [(1, FIXTURE_LIPID)]
    obs = extract_observations_from_text(pages)
    tests = {o["canonical_test"]: o for o in obs}

    assert "total_cholesterol" in tests
    assert tests["total_cholesterol"]["numeric_value"] == 210

    assert "ldl_cholesterol" in tests
    assert tests["ldl_cholesterol"]["numeric_value"] == 135

    assert "hdl_cholesterol" in tests
    assert tests["hdl_cholesterol"]["numeric_value"] == 42

def test_synthetic_fixture_glucose_extraction():
    pages = [(1, FIXTURE_GLUCOSE)]
    obs = extract_observations_from_text(pages)
    tests = {o["canonical_test"]: o for o in obs}

    assert "fasting_blood_sugar" in tests
    assert tests["fasting_blood_sugar"]["numeric_value"] == 118
    assert tests["fasting_blood_sugar"]["bounds_low"] == 70.0
    assert tests["fasting_blood_sugar"]["bounds_high"] == 99.0

    assert "hba1c" in tests
    assert tests["hba1c"]["numeric_value"] == 6.2

def test_synthetic_fixture_comparator_and_corrupt():
    # Comparator: should parse '< 0.5' with comparator '<' and numeric 0.5 without treating as range bounds
    pages_comp = [(1, FIXTURE_COMPARATOR)]
    obs_comp = extract_observations_from_text(pages_comp)
    assert len(obs_comp) >= 1
    crp = obs_comp[0]
    assert crp["comparator"] == "<"
    assert crp["numeric_value"] == 0.5

    # Corrupt unreadable text: should not crash, returns empty observations
    pages_corrupt = [(1, FIXTURE_CORRUPT)]
    obs_corrupt = extract_observations_from_text(pages_corrupt)
    assert isinstance(obs_corrupt, list)
    assert len(obs_corrupt) == 0

def test_observation_confirmation_workflow(client, user_a):
    fake_pdf = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = client.post(
        "/v1/reports",
        headers=user_a["headers"],
        files={"file": ("lab_report.pdf", io.BytesIO(fake_pdf), "application/pdf")}
    )
    assert upload_res.status_code == 200
    report_id = upload_res.json()["report_id"]

    # Retrieve report
    rep = client.get(f"/v1/reports/{report_id}", headers=user_a["headers"]).json()
    assert rep["id"] == report_id

    # Update observations
    obs_id = str(uuid.uuid4())
    patch_res = client.patch(
        f"/v1/reports/{report_id}/observations",
        headers=user_a["headers"],
        json={"observations": [{"id": obs_id, "status": "confirmed", "numeric_value": 15.0}]}
    )
    assert patch_res.status_code == 200
