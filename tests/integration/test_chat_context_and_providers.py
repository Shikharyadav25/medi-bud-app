import json
import uuid
from datetime import datetime, timezone
import pytest
import requests
from config import settings
from services import chat_provider, context_chat
from storage import DurableMap


@pytest.fixture(autouse=True)
def isolated_provider_config(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "GROQ_API_KEY", "")
    monkeypatch.setattr(settings, "CHAT_PROVIDER", "auto")
    monkeypatch.setattr(settings, "CHAT_FALLBACK_PROVIDER", "groq")
    chat_provider._cooldowns.clear()


def ask(client, user, query, **options):
    response = client.post(
        "/v1/chat", headers=user["headers"], json={"query": query, **options}
    )
    assert response.status_code == 200, response.text
    return response.json()


def test_chat_reads_profile_and_never_other_account(client, user_a, user_b):
    client.put(
        "/v1/me", headers=user_a["headers"], json={"name": "Synthetic Alice", "age": 35}
    )
    client.put(
        "/v1/me", headers=user_b["headers"], json={"name": "Private Bob", "age": 65}
    )
    result = ask(client, user_a, "What is my saved name and age?")
    assert "Synthetic Alice" in result["answer"] and "35" in result["answer"]
    assert "Private Bob" not in json.dumps(result)
    assert result["context_scope"] == "account"


def test_chat_sums_actual_water_logs(client, user_a):
    for amount in (250, 500):
        response = client.post(
            "/v1/logs",
            headers=user_a["headers"],
            json={
                "kind": "water",
                "value": amount,
                "unit": "ml",
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "timezone": "UTC",
                "mutation_id": str(uuid.uuid4()),
            },
        )
        assert response.status_code == 200
    result = ask(client, user_a, "How much water did I log today?")
    assert "750" in result["answer"]
    assert "Today's saved journal summary" in result["answer"]


def test_general_question_uses_provider_without_app_records(
    client, user_a, monkeypatch
):
    client.put(
        "/v1/me", headers=user_a["headers"], json={"name": "Do not transmit this"}
    )
    captured = []

    def generate(prompt, allow_fallback):
        captured.append(json.loads(prompt))
        return (
            chat_provider.ChatOutput(
                answer="Here is general educational information.", source_ids=[]
            ),
            "groq",
        )

    monkeypatch.setattr(context_chat, "generate_chat", generate)
    result = ask(client, user_a, "What is asthma?", allow_ai=True)
    assert captured[0]["scope"] == "GENERAL" and captured[0]["records"] == []
    assert "Do not transmit this" not in json.dumps(captured)
    assert result["provider"] == "groq" and result["citations"] == []


def test_without_consent_does_not_call_external_provider(client, user_a, monkeypatch):
    def unexpected(*args):
        pytest.fail("Provider called without consent")

    monkeypatch.setattr(context_chat, "generate_chat", unexpected)
    result = ask(client, user_a, "What is asthma?")
    assert "permission" in result["answer"]


def test_missing_keys_report_configuration_not_fake_answer(client, user_a):
    result = ask(client, user_a, "What is asthma?", allow_ai=True)
    assert result["provider_status"] == "unconfigured"
    assert "not configured" in result["answer"]


def test_account_generation_validates_source_ids_and_numbers(
    client, user_a, monkeypatch
):
    client.put("/v1/me", headers=user_a["headers"], json={"age": 35})
    monkeypatch.setattr(
        context_chat,
        "generate_chat",
        lambda *args: (
            chat_provider.ChatOutput(answer="Your age is 35.", source_ids=["profile"]),
            "gemini",
        ),
    )
    good = ask(client, user_a, "What is my age?", allow_ai=True)
    assert (
        good["provider_status"] == "ok"
        and good["citations"][0]["source_id"] == "profile"
    )
    monkeypatch.setattr(
        context_chat,
        "generate_chat",
        lambda *args: (
            chat_provider.ChatOutput(
                answer="Your age is 999.5.", source_ids=["profile"]
            ),
            "gemini",
        ),
    )
    bad = ask(client, user_a, "What is my age?", allow_ai=True)
    assert bad["provider_status"] == "invalid_response" and "999.5" not in bad["answer"]


def test_general_prompt_does_not_include_previous_private_conversation(
    client, user_a, monkeypatch
):
    client.put("/v1/me", headers=user_a["headers"], json={"name": "Private Patient"})
    ask(client, user_a, "What is my name?")
    captured = []

    def generate(prompt, fallback):
        captured.append(prompt)
        return (
            chat_provider.ChatOutput(answer="General education.", source_ids=[]),
            "gemini",
        )

    monkeypatch.setattr(context_chat, "generate_chat", generate)
    ask(client, user_a, "What is diabetes?", allow_ai=True, context_mode="general")
    assert "Private Patient" not in captured[0]


def test_emergency_never_calls_a_provider(client, user_a, monkeypatch):
    monkeypatch.setattr(
        context_chat,
        "generate_chat",
        lambda *args: pytest.fail("Emergency must not wait for AI"),
    )
    result = ask(client, user_a, "I have crushing chest pain", allow_ai=True)
    assert result["safety_action"] == "EMERGENCY_ESCALATION"


def test_emergency_followup_retains_escalation(client, user_a):
    ask(client, user_a, "I have crushing chest pain")
    result = ask(client, user_a, "Can I wait with this?", allow_ai=True)
    assert result["safety_action"] == "EMERGENCY_ESCALATION"


def test_account_prompt_sends_relevant_journal_not_unrelated_profile(
    client, user_a, monkeypatch
):
    client.put(
        "/v1/me",
        headers=user_a["headers"],
        json={"name": "Unrelated private name", "medications": ["Private medication"]},
    )
    prompts = []

    def generate(prompt, fallback):
        prompts.append(prompt)
        return (
            chat_provider.ChatOutput(
                answer="No water has been logged in these entries.",
                source_ids=["journal_summary"],
            ),
            "gemini",
        )

    monkeypatch.setattr(context_chat, "generate_chat", generate)
    result = ask(client, user_a, "How much water did I log today?", allow_ai=True)
    assert result["provider_status"] == "ok"
    assert (
        "Unrelated private name" not in prompts[0]
        and "Private medication" not in prompts[0]
    )


def test_general_my_headache_is_education_not_invented_app_record():
    assert not context_chat.account_question("Why does my head hurt?")
    assert context_chat.account_question("What am I allergic to?")
    assert context_chat.account_question("What is my hemoglobin?")


def test_missing_profile_field_is_not_invented(client, user_a):
    client.get("/v1/me", headers=user_a["headers"])
    result = ask(client, user_a, "What is my age?")
    assert "age: not recorded" in result["answer"]


def test_missing_plan_does_not_dump_unrelated_lab_records(client, user_a):
    result = ask(client, user_a, "What is my saved diet plan?")
    assert "No saved plan" in result["answer"]


def test_safety_block_does_not_try_second_provider(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "synthetic-test-key")
    calls = []

    def post(*args, **kwargs):
        calls.append(args)
        return FakeResponse(data={"promptFeedback": {"blockReason": "SAFETY"}})

    monkeypatch.setattr(chat_provider.requests, "post", post)
    with pytest.raises(chat_provider.ProviderError) as error:
        chat_provider.generate_chat("synthetic question", True)
    assert error.value.code == "blocked" and len(calls) == 1


class FakeResponse:
    def __init__(self, status=200, data=None):
        self.status_code, self.data = status, data
        self.ok = status < 400
        self.headers = {"Retry-After": "30"}

    def json(self):
        return self.data


def test_rate_limited_gemini_falls_back_to_groq_only_when_allowed(monkeypatch):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "synthetic-test-key")
    calls = []

    def post(url, **options):
        calls.append((url, options))
        if "googleapis" in url:
            return FakeResponse(429)
        return FakeResponse(
            data={
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {"answer": "General education", "source_ids": []}
                            )
                        }
                    }
                ]
            }
        )

    monkeypatch.setattr(chat_provider.requests, "post", post)
    with pytest.raises(chat_provider.ProviderError) as error:
        chat_provider.generate_chat("synthetic question", False)
    assert error.value.code == "rate_limited" and len(calls) == 1
    result, provider = chat_provider.generate_chat("synthetic question", True)
    assert provider == "groq" and len(calls) == 2
    assert "synthetic-test-key" not in calls[0][0]


@pytest.mark.parametrize("status", [400, 401, 403])
def test_provider_rejection_is_not_bypassed_with_fallback(monkeypatch, status):
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "synthetic-test-key")
    monkeypatch.setattr(settings, "GROQ_API_KEY", "synthetic-test-key")
    calls = []

    def post(*args, **kwargs):
        calls.append(args)
        return FakeResponse(status)

    monkeypatch.setattr(chat_provider.requests, "post", post)
    with pytest.raises(chat_provider.ProviderError):
        chat_provider.generate_chat("synthetic question", True)
    assert len(calls) == 1


def test_groq_only_configuration_is_selected_automatically(monkeypatch):
    monkeypatch.setattr(settings, "GROQ_API_KEY", "synthetic-test-key")
    assert chat_provider.effective_provider() == "groq"


def test_demo_sample_is_explicit_scoped_and_idempotent(client, user_a, monkeypatch):
    assert (
        client.post("/v1/reports/demo-sample", headers=user_a["headers"]).status_code
        == 404
    )
    monkeypatch.setattr(settings, "ENABLE_DEMO_AUTH", True)
    headers = {"Authorization": "Bearer demo_jwt_token"}
    first = client.post("/v1/reports/demo-sample", headers=headers)
    second = client.post("/v1/reports/demo-sample", headers=headers)
    assert (
        first.status_code == 200
        and first.json()["report_id"] == second.json()["report_id"]
    )
    detail = client.get(
        "/v1/reports/" + first.json()["report_id"], headers=headers
    ).json()
    assert detail["filename"].startswith("SYNTHETIC") and detail["demo_sample"]
    assert len(detail["observations"]) == 3
    assert all(o["status"] == "proposed" for o in detail["observations"])
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    assert (
        client.post("/v1/reports/demo-sample", headers=user_a["headers"]).status_code
        == 404
    )


def test_saved_text_conversation_reload_and_account_isolation(client, user_a, user_b):
    response = client.post("/v1/chat", headers=user_a["headers"], json={
        "query": "What is my name?", "context_mode": "account",
        "conversation_id": "default", "allow_ai": False,
    })
    assert response.status_code == 200
    history = client.get("/v1/conversations/default", headers=user_a["headers"])
    assert history.status_code == 200
    messages = history.json()
    assert [m["role"] for m in messages] == ["user", "assistant"]
    assert messages[0]["text"] == "What is my name?"
    assert messages[1]["response"]["answer"] == response.json()["answer"]
    assert messages[1]["created_at"]
    assert client.get("/v1/conversations/default", headers=user_b["headers"]).json() == []
    assert client.get("/v1/conversations/report:another", headers=user_a["headers"]).json() == []
