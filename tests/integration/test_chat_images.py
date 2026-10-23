import base64
import io
import json
import time

import pytest
from PIL import Image

from config import settings
from routes import chat_image_routes as route
from services import chat_provider
from services.chat_provider import ProviderError
from storage import DurableMap


def png():
    output = io.BytesIO()
    Image.new("RGB", (32, 32), "white").save(output, format="PNG")
    return output.getvalue()


def upload(client, user, **kwargs):
    fields = {
        "query": "Explain what is visible",
        "consent_ai": "true",
        **kwargs.pop("fields", {}),
    }
    return client.post(
        "/v1/chat/images",
        headers=user["headers"],
        data=fields,
        files={"file": ("test.png", kwargs.pop("raw", png()), "image/png")},
        **kwargs,
    )


@pytest.fixture(autouse=True)
def provider(monkeypatch):
    monkeypatch.setattr(settings, "AI_RATE_LIMIT_PER_MINUTE", 1000)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    monkeypatch.setattr(settings, "CHAT_PROVIDER", "auto")
    chat_provider._cooldowns.clear()


def report(monkeypatch):
    output = route.ImageAnswer(
        kind="report",
        answer="Hemoglobin is shown. Review the value before saving.",
        tests=[
            {
                "name": "Hemoglobin",
                "value": "14.2",
                "unit": "g/dL",
                "reference_range": "13–17",
            }
        ],
    )
    monkeypatch.setattr(route, "analyze_image", lambda *args: (output, "groq"))


def test_auth_consent_validation_and_no_provider_call(client, user_a, monkeypatch):
    def unexpected(*args):
        pytest.fail("Provider must not be called")

    monkeypatch.setattr(route, "analyze_image", unexpected)
    assert (
        client.post(
            "/v1/chat/images", files={"file": ("a.png", png())}, data={"query": "hello"}
        ).status_code
        == 401
    )
    assert upload(client, user_a, fields={"consent_ai": "false"}).status_code == 422
    assert upload(client, user_a, raw=b"not an image").status_code == 422
    assert upload(client, user_a, fields={"query": "  "}).status_code == 422
    assert upload(client, user_a, fields={"kind": "bad"}).status_code == 422
    monkeypatch.setattr(settings, "MAX_UPLOAD_SIZE_BYTES", 30)
    assert upload(client, user_a).status_code == 413


def test_report_save_is_explicit_owner_scoped_proposed_and_idempotent(
    client, user_a, user_b, monkeypatch
):
    report(monkeypatch)
    before = len(client.get("/v1/reports", headers=user_a["headers"]).json())
    response = upload(client, user_a)
    assert response.status_code == 200, response.text
    draft = response.json()["draft_id"]
    assert len(client.get("/v1/reports", headers=user_a["headers"]).json()) == before
    assert (
        client.post(
            f"/v1/chat/images/{draft}/save", headers=user_b["headers"]
        ).status_code
        == 404
    )
    assert (
        client.delete(f"/v1/chat/images/{draft}", headers=user_b["headers"]).status_code
        == 404
    )
    saved = client.post(
        f"/v1/chat/images/{draft}/save", headers=user_a["headers"]
    ).json()
    assert saved["status"] == "review_needed"
    assert (
        client.post(f"/v1/chat/images/{draft}/save", headers=user_a["headers"]).json()
        == saved
    )
    obs = client.get(
        f"/v1/reports/{saved['report_id']}", headers=user_a["headers"]
    ).json()["observations"]
    assert obs[0]["status"] == "proposed" and obs[0]["numeric_value"] == 14.2
    assert "image" not in route._DRAFTS[draft]
    download = client.get(
        f"/v1/reports/{saved['report_id']}/file", headers=user_a["headers"]
    )
    assert download.content.startswith(b"\xff\xd8\xff")
    assert (
        client.get(
            f"/v1/reports/{saved['report_id']}", headers=user_b["headers"]
        ).status_code
        == 404
    )
    export = client.get("/v1/me/export", headers=user_a["headers"]).json()
    assert any(x["collection"] == "chat_image_drafts" for x in export["records"])


def test_meal_only_enters_context_after_explicit_save(client, user_a, monkeypatch):
    output = route.ImageAnswer(
        kind="meal",
        answer="An approximate meal estimate.",
        food_items=[
            {
                "name": "Rice",
                "quantity": "about 1 cup",
                "calories": 200.0,
                "protein_g": 4.0,
                "carbs_g": 44.0,
                "fat_g": 1.0,
            }
        ],
    )
    monkeypatch.setattr(route, "analyze_image", lambda *args: (output, "gemini"))
    draft = upload(client, user_a).json()["draft_id"]
    assert client.get("/v1/meals", headers=user_a["headers"]).json() == []
    saved = client.post(f"/v1/chat/images/{draft}/save", headers=user_a["headers"])
    assert saved.status_code == 200
    assert (
        client.post(f"/v1/chat/images/{draft}/save", headers=user_a["headers"]).json()
        == saved.json()
    )
    meals = client.get("/v1/meals", headers=user_a["headers"]).json()
    assert len(meals) == 1 and meals[0]["is_estimated"] is True
    assert meals[0]["calories"] == 200.0 and "image" not in meals[0]
    answer = client.post(
        "/v1/chat",
        headers=user_a["headers"],
        json={"query": "What meals did I log?", "context_mode": "account"},
    ).json()
    assert "Rice" in answer["answer"] and "estimated" in answer["answer"]


def test_discard_expiry_and_account_deletion_remove_private_drafts(
    client, user_a, monkeypatch
):
    report(monkeypatch)
    draft = upload(client, user_a).json()["draft_id"]
    assert (
        client.delete(f"/v1/chat/images/{draft}", headers=user_a["headers"]).status_code
        == 200
    )
    assert draft not in route._DRAFTS
    assert (
        client.post(
            f"/v1/chat/images/{draft}/save", headers=user_a["headers"]
        ).status_code
        == 404
    )
    draft = upload(client, user_a).json()["draft_id"]
    row = route._DRAFTS[draft]
    row["expires_at"] = time.time() - 1
    route._DRAFTS[draft] = row
    assert (
        client.post(
            f"/v1/chat/images/{draft}/save", headers=user_a["headers"]
        ).status_code
        == 404
    )
    route.purge_expired_drafts()
    assert draft not in route._DRAFTS
    draft = upload(client, user_a).json()["draft_id"]
    client.delete("/v1/me", headers=user_a["headers"])
    assert draft not in route._DRAFTS


def test_emergency_does_not_wait_for_image_ai(client, user_a, monkeypatch):
    monkeypatch.setattr(
        route,
        "analyze_image",
        lambda *args: pytest.fail("No provider during emergency"),
    )
    result = upload(
        client,
        user_a,
        fields={
            "query": "I have crushing chest pain and difficulty breathing",
            "consent_ai": "false",
        },
    )
    assert (
        result.status_code == 200
        and result.json()["safety_action"] == "EMERGENCY_ESCALATION"
    )
    assert "draft_id" not in result.json()


def test_missing_provider_and_draft_limit_are_honest(client, user_a, monkeypatch):
    response = upload(client, user_a)
    assert response.status_code == 503 and "not configured" in response.text
    assert not any(d["user_id"] == user_a["user_id"] for d in route._DRAFTS.values())
    report(monkeypatch)
    for _ in range(10):
        assert upload(client, user_a).status_code == 200
    assert upload(client, user_a).status_code == 409


def test_normalized_image_only_and_no_saved_context_sent(client, user_a, monkeypatch):
    captured = []
    client.put(
        "/v1/me", headers=user_a["headers"], json={"name": "Secret name not to send"}
    )

    def fake_call(provider, prompt, **kwargs):
        captured.append((provider, prompt, kwargs))
        return route.ImageAnswer(kind="other", answer="No readable report values.")

    monkeypatch.setattr(route, "_call", fake_call)
    result = upload(client, user_a)
    assert result.status_code == 200 and "draft_id" not in result.json()
    assert "Secret name" not in json.dumps(captured, default=str)
    assert base64.b64decode(captured[0][2]["image"]["data"]).startswith(b"\xff\xd8\xff")


def test_vision_groq_payload_validation_and_no_safety_fallback(monkeypatch):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "test-only")
    captured = []

    class Response:
        status_code = 200
        ok = True

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {"kind": "other", "answer": "Image response"}
                            )
                        }
                    }
                ]
            }

    def post(url, **kwargs):
        captured.append(kwargs["json"])
        return Response()

    monkeypatch.setattr(chat_provider.requests, "post", post)
    output, provider = route.analyze_image(png(), "What is visible?", "auto", False)
    assert provider == "groq" and output.kind == "other"
    payload = captured[0]
    assert payload["model"] == settings.GROQ_VISION_MODEL
    assert payload["messages"][1]["content"][1]["image_url"]["url"].startswith(
        "data:image/jpeg;base64,"
    )
    calls = []

    def blocked(provider, *args, **kwargs):
        calls.append(provider)
        raise ProviderError("blocked")

    monkeypatch.setattr(route, "_call", blocked)
    with pytest.raises(ProviderError):
        route.analyze_image(png(), "query", "auto", True)
    assert len(calls) == 1


def test_invalid_or_conflicting_model_data_rejected():
    with pytest.raises(ValueError):
        route.ImageAnswer(
            kind="other", answer="Hi", tests=[{"name": "X", "value": "9"}]
        )


def test_deletion_during_image_analysis_cannot_resurrect_data(
    client, user_a, monkeypatch
):
    from storage import delete_user_data

    def deleted_during_call(*args):
        delete_user_data(user_a["user_id"])
        return (
            route.ImageAnswer(
                kind="report",
                answer="Transcription",
                tests=[{"name": "Hemoglobin", "value": "14.2"}],
            ),
            "gemini",
        )

    monkeypatch.setattr(route, "analyze_image", deleted_during_call)
    assert upload(client, user_a).status_code == 401
    assert not any(d["user_id"] == user_a["user_id"] for d in route._DRAFTS.values())


def test_vision_gemini_payload_and_permitted_transient_fallback(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-only")
    monkeypatch.setattr(settings, "CHAT_PROVIDER", "gemini")
    captured = []

    class Response:
        status_code = 200
        ok = True

        def json(self):
            return {
                "candidates": [
                    {
                        "content": {
                            "parts": [
                                {
                                    "text": json.dumps(
                                        {
                                            "kind": "unclear",
                                            "answer": "Please upload a clearer image.",
                                        }
                                    )
                                }
                            ]
                        }
                    }
                ]
            }

    def post(url, **kwargs):
        captured.append(kwargs["json"])
        return Response()

    monkeypatch.setattr(chat_provider.requests, "post", post)
    output, provider = route.analyze_image(png(), "Explain", "auto", False)
    assert provider == "gemini" and output.kind == "unclear"
    assert (
        captured[0]["contents"][0]["parts"][1]["inline_data"]["mime_type"]
        == "image/jpeg"
    )
    calls = []

    def unavailable(provider, *args, **kwargs):
        calls.append(provider)
        if provider == "gemini":
            raise ProviderError("rate_limited")
        return route.ImageAnswer(kind="other", answer="Educational response")

    monkeypatch.setattr(route, "_call", unavailable)
    with pytest.raises(ProviderError):
        route.analyze_image(png(), "Explain", "auto", False)
    assert calls == ["gemini"]
    calls.clear()
    _, provider = route.analyze_image(png(), "Explain", "auto", True)
    assert provider == "groq" and calls == ["gemini", "groq"]
    with pytest.raises(ValueError):
        route.ImageAnswer(
            kind="meal",
            answer="Hi",
            food_items=[
                {
                    "name": "Rice",
                    "quantity": "cup",
                    "calories": float("nan"),
                    "protein_g": 0.0,
                    "carbs_g": 0.0,
                    "fat_g": 0.0,
                }
            ],
        )
