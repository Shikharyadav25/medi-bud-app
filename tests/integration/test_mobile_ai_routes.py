def test_mobile_diet_contract_and_allergen_filter(client):
    response = client.post(
        "/api/ai/generate-diet",
        json={"profile": {"name": "Mira", "dietaryPreferences": ["Vegetarian"], "allergies": ["peanuts"]}, "calorieGoal": 2100},
    )
    assert response.status_code == 200
    plan = response.json()
    assert plan["targetDailyCalories"] == 2100
    assert len(plan["days"]) == 7
    assert set(plan["days"][0]["meals"]) == {"breakfast", "lunch", "eveningSnack", "dinner"}


def test_mobile_symptom_red_flag_is_deterministic(client):
    response = client.post("/api/ai/symptom-triage", json={"symptoms": "Crushing chest pain and I cannot breathe"})
    assert response.status_code == 200
    result = response.json()
    assert result["isEmergency"] is True
    assert result["triageLevel"] == "EMERGENCY"
    assert "112" in result["advisoryMessage"]


def test_mobile_report_local_fallback_extracts_supported_labs(client, monkeypatch):
    monkeypatch.setattr("services.mobile_ai_service._gemini_json", lambda *args, **kwargs: None)
    response = client.post(
        "/api/reports/analyze",
        json={
            "documentText": "Patient: Demo\nLaboratory CBC report\nHemoglobin 14.2 g/dL Reference Range 13.0 - 17.0",
            "mimeType": "text/plain",
            "title": "Demo CBC.txt",
        },
    )
    assert response.status_code == 200
    result = response.json()
    assert result["isMedicalReport"] is True
    assert result["processingMode"] == "local_extractive_fallback"
    assert result["report"]["testResults"][0]["testName"] == "hemoglobin"


def test_mobile_report_rejects_unrelated_text(client, monkeypatch):
    monkeypatch.setattr("services.mobile_ai_service._gemini_json", lambda *args, **kwargs: None)
    response = client.post(
        "/api/reports/analyze",
        json={"documentText": "A weekend travel itinerary with hotel and sightseeing notes.", "mimeType": "text/plain", "title": "trip.txt"},
    )
    assert response.status_code == 200
    assert response.json()["isMedicalReport"] is False
