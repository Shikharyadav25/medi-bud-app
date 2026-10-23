"""Owner-scoped app context plus explicit, optional external generation."""

import json
import re
import uuid
from datetime import datetime
from zoneinfo import ZoneInfo
from storage import DurableMap, DurableList
from services.sync_service import get_user_offline_logs
from services.orchestrator import orchestrate_chat_query, check_emergency_signals
from services.chat_provider import generate_chat, ProviderError

DISCLAIMER = "Educational information, not a diagnosis or treatment. Verify medical decisions with a qualified clinician."


def account_question(query, report_id=None):
    text = query.lower()
    return bool(
        report_id
        or re.fullmatch(
            r"\s*(hemoglobin|hba1c|ldl|hdl|cholesterol|glucose|platelets?)\s*", text
        )
        or re.search(
            r"\b(logged|saved|uploaded|confirmed|about me|in the app|in this app)\b",
            text,
        )
        or (
            re.search(r"\b(my|mine|i|me)\b", text)
            and re.search(
                r"report|result|value|profile|health|name|age|weight|height|allerg|condition|medicat|medicine|water|sleep|habit|remind|plan|diet|meal|eat|ate|calorie|activity|exercise|walk|goal|hemoglobin|hba1c|cholesterol|glucose|blood|b12|platelet|\brbc\b|\bwbc\b",
                text,
            )
        )
    )


def collect_context(uid, report_id=None):
    records = []

    def add(source_id, title, value):
        if value:
            records.append(
                {
                    "source_id": source_id,
                    "title": title,
                    "text": json.dumps(value, ensure_ascii=False, default=str)[:7000],
                }
            )

    profile = DurableMap("profiles").get(uid)
    if profile:
        add(
            "profile",
            "Your saved profile (self-reported)",
            {
                k: v
                for k, v in profile.items()
                if k not in ("user_id", "version") and v not in (None, "", [], "User")
            },
        )
    reports = [
        r
        for r in DurableMap("reports").values()
        if r.get("user_id") == uid and (not report_id or r["id"] == report_id)
    ]
    observations = []
    all_obs = DurableMap("observations")
    for report in reports[:30]:
        rows = [o for o in all_obs.get(report["id"], []) if o.get("user_id") == uid]
        confirmed = [o for o in rows if o.get("status") == "confirmed"]
        observations.extend(confirmed)
        add(
            "report:" + report["id"],
            "Report: " + report["filename"],
            {
                "filename": report["filename"],
                "date": report.get("report_date"),
                "pending_review_count": sum(
                    o.get("status") == "proposed" for o in rows
                ),
                "confirmed_values": [
                    {
                        k: o.get(k)
                        for k in (
                            "canonical_test",
                            "value_text",
                            "unit",
                            "reference_text",
                        )
                    }
                    for o in confirmed
                ],
            },
        )
    known_ids = {o.get("id") for o in observations}
    for rows in all_obs.values():
        for observation in rows:
            if (
                observation.get("user_id") == uid
                and observation.get("status") == "confirmed"
                and observation.get("id") not in known_ids
                and (not report_id or observation.get("report_id") == report_id)
            ):
                observations.append(observation)
                add(
                    "observation:" + str(observation.get("id")),
                    "Confirmed observation",
                    {
                        k: observation.get(k)
                        for k in (
                            "canonical_test",
                            "value_text",
                            "unit",
                            "reference_text",
                        )
                    },
                )
    logs = [
        r for r in DurableList("logs") if r.get("user_id") == uid
    ] + get_user_offline_logs(uid)
    logs.sort(key=lambda r: r.get("occurred_at", ""), reverse=True)
    zone_name = logs[0].get("timezone", "UTC") if logs else "UTC"
    zone = ZoneInfo(zone_name)
    today = datetime.now(zone).date()
    today_logs = [
        r
        for r in logs
        if datetime.fromisoformat(r["occurred_at"].replace("Z", "+00:00"))
        .astimezone(zone)
        .date()
        == today
    ]
    add(
        "journal_summary",
        "Today's saved journal summary",
        {
            "date": str(today),
            "timezone": zone_name,
            "water_ml": sum(r["value"] for r in today_logs if r.get("kind") == "water"),
            "activity_minutes": sum(
                r["value"] for r in today_logs if r.get("kind") == "activity"
            ),
            "latest_sleep_hours": next(
                (r["value"] for r in today_logs if r.get("kind") == "sleep"), None
            ),
            "note": "No log is not proof of no intake, sleep or activity. These are self-entered records, not measurements by the app.",
        },
    )
    add(
        "journal",
        "Your recent saved journal entries (latest 50)",
        [
            {k: r.get(k) for k in ("kind", "value", "unit", "occurred_at", "timezone")}
            for r in logs[:50]
        ],
    )
    for ns, title in (
        ("reminders", "Your saved reminders"),
        ("completions", "Your reminder completions"),
        ("meals", "Your logged meals"),
    ):
        add(
            ns,
            title,
            [
                {k: v for k, v in r.items() if k != "user_id"}
                for r in DurableList(ns)
                if r.get("user_id") == uid
            ][-30:],
        )
    plan = DurableMap("plans").get(uid)
    if plan and plan.get("user_id") == uid:
        add(
            "plan",
            "Your saved meal ideas (not a prescribed diet)",
            {k: v for k, v in plan.items() if k != "user_id"},
        )
    return records, observations


def answer_question(
    uid,
    query,
    report_id=None,
    allow_ai=False,
    allow_fallback=False,
    context_mode="auto",
    history=None,
):
    history = history or []
    previous_question = next(
        (m.get("text", "") for m in reversed(history) if m.get("role") == "user"), ""
    )
    emergency_followup = bool(
        re.search(r"\b(it|this|that|wait)\b|what should i do", query.lower())
        and check_emergency_signals(previous_question)
    )
    if check_emergency_signals(query) or emergency_followup:
        return orchestrate_chat_query(
            uid,
            previous_question + "\n" + query if emergency_followup else query,
            [],
            [],
            report_id,
        )
    followup_account = bool(
        history
        and history[-1].get("context_scope") == "account"
        and re.search(r"\b(it|this|that|these|those|they)\b", query.lower())
    )
    personal = context_mode == "account" or (
        context_mode == "auto"
        and (account_question(query, report_id) or followup_account)
    )
    records, observations = collect_context(uid, report_id) if personal else ([], [])
    base = orchestrate_chat_query(uid, query, [], observations, report_id)
    base.update(
        {
            "context_scope": "account" if personal else "general",
            "provider": None,
            "provider_status": "not_requested",
        }
    )
    generation_records = records
    if personal:
        own_citations = [
            c for c in base["citations"] if c["source_id"].startswith("obs_")
        ]
        base["citations"] = own_citations
        base["answer"] = (
            "From your confirmed report values:\n"
            + "\n".join(c["excerpt"] for c in own_citations)
            + "\n\n"
            + DISCLAIMER
            if own_citations
            else "No matching confirmed report value was found. Missing or unreviewed information cannot be treated as a verified personal fact."
        )
        # Prefer the exact lab match when present; otherwise expose the relevant
        # actual app sections instead of pretending that only reports exist.
        words = query.lower()
        topics = [
            (r"water|sleep|exercise|activity|walk|journal|log|hydration", "journal"),
            (r"remind|medication|medicine", "reminders"),
            (r"meal|diet|food|eat|calorie|protein|plan", "plan"),
            (
                r"name|age|height|weight|allerg|profile|condition|goal|medicat|medicine",
                "profile",
            ),
        ]
        matched_topics = [
            topic for pattern, topic in topics if re.search(pattern, words)
        ]
        selected = [
            r
            for r in records
            if any(
                re.search(pattern, words)
                and (
                    r["source_id"] == topic
                    or topic == "plan"
                    and r["source_id"] == "meals"
                    or topic == "reminders"
                    and r["source_id"] == "completions"
                    or topic == "journal"
                    and r["source_id"] == "journal_summary"
                )
                for pattern, topic in topics
            )
        ]
        requested_profile_fields = [
            field
            for pattern, field in (
                (r"\bname\b", "name"),
                (r"\bage\b", "age"),
                (r"height", "height_cm"),
                (r"weight", "weight_kg"),
                (r"allerg", "declared_allergens"),
                (r"medicat|medicine", "medications"),
                (r"condition", "conditions"),
                (r"goal", "goals"),
            )
            if re.search(pattern, words)
        ]
        if requested_profile_fields:
            selected = [
                (
                    {
                        **r,
                        "text": json.dumps(
                            {
                                field: json.loads(r["text"]).get(field, "not recorded")
                                for field in requested_profile_fields
                            }
                        ),
                    }
                    if r["source_id"] == "profile"
                    else r
                )
                for r in selected
            ]
        if not selected and not base["citations"] and not matched_topics:
            report_question = bool(
                report_id
                or re.search(
                    r"report|cbc|test|result|blood|level|b12|hemoglobin|hba1c|cholesterol|glucose",
                    words,
                )
            )
            selected = (
                [r for r in records if r["source_id"].startswith("report:")]
                if report_question
                else records
            )
        if selected:
            generation_records = selected

            def readable(value, indent=""):
                if isinstance(value, dict):
                    return "\n".join(
                        indent
                        + k.replace("_", " ")
                        + ": "
                        + ("not recorded" if v is None else readable(v, indent + "  "))
                        for k, v in value.items()
                    )
                if isinstance(value, list):
                    return (
                        "\n".join(readable(v, indent) for v in value) or "none recorded"
                    )
                return str(value)

            def display(record):
                try:
                    return (
                        record["title"] + ":\n" + readable(json.loads(record["text"]))
                    )
                except ValueError:
                    return (
                        record["title"]
                        + " (partial saved context; narrow your question):\n"
                        + record["text"]
                    )

            base["answer"] = (
                "From your saved Medi Bud records:\n\n"
                + "\n\n".join(display(r) for r in selected)
                + "\n\nMissing fields are not recorded; device-only unsynced information is not available here. "
                + DISCLAIMER
            )
            base["citations"] = [
                {
                    "source_id": r["source_id"],
                    "title": r["title"],
                    "excerpt": r["text"][:250],
                    "page": None,
                    "date": "Saved app data",
                }
                for r in selected
            ]
        elif own_citations:
            generation_records = [
                r
                for r in records
                if r["source_id"].startswith(("report:", "observation:"))
            ]
        elif matched_topics:
            base["answer"] = (
                "No saved "
                + ", ".join(dict.fromkeys(matched_topics))
                + " information matching this question was found. Add it in the relevant app section first; I will not guess personal details."
            )
            generation_records = []
        base["limitations"] = (
            "Uses only this account's saved server records and confirmed observations. Self-reported data is not clinically verified; unsynced device data is excluded."
        )
        if not generation_records:
            return base
    if not allow_ai:
        if not personal:
            base["answer"] = (
                "General AI answers require your permission to send this question to the configured AI provider. Enable external AI below.\n\n"
                + (
                    base["answer"]
                    if base["citations"]
                    else "No matching local reference was found."
                )
            )
        return base
    prompt = json.dumps(
        {
            "scope": "ACCOUNT" if personal else "GENERAL",
            "question": query,
            "records": generation_records if personal else [],
            "recent_conversation_not_a_source_of_facts": [
                {"role": m["role"], "text": m["text"][:1000]}
                for m in history
                if m.get("context_scope") == ("account" if personal else "general")
                and (not report_id or m.get("report_id") == report_id)
            ][-6:],
            "limits": "Only the latest bounded saved records are supplied; no hidden access to other users or unsynced mobile data.",
        },
        ensure_ascii=False,
    )
    if len(prompt) > 24000:
        base["provider_status"] = "context_too_large"
        base[
            "limitations"
        ] += " The AI context limit was reached; showing local evidence instead. Narrow your question."
        return base
    try:
        output, provider = generate_chat(prompt, allow_fallback)
        allowed = {r["source_id"]: r for r in generation_records}
        if any(source not in allowed for source in output.source_ids) or (
            personal and generation_records and not output.source_ids
        ):
            raise ProviderError("invalid_response")
        # Numbers in personal answers must already occur in the supplied records.
        if personal:
            source_numbers = set(
                re.findall(r"\d+(?:\.\d+)?", json.dumps(generation_records))
            )
            if not set(re.findall(r"\d+(?:\.\d+)?", output.answer)).issubset(
                source_numbers
            ):
                raise ProviderError("invalid_response")
        citations = [
            {
                "source_id": s,
                "title": allowed[s]["title"],
                "excerpt": allowed[s]["text"][:250],
                "page": None,
                "date": "Saved app data",
            }
            for s in dict.fromkeys(output.source_ids)
        ]
        return {
            **base,
            "answer": output.answer + "\n\n" + DISCLAIMER,
            "mode": "grounded_generation",
            "citations": citations,
            "provider": provider,
            "provider_status": "ok",
            "limitations": "AI-generated educational response. "
            + (
                base["limitations"]
                if personal
                else "General information, not a review of your personal records. No web search or independently verified medical citations were used."
            ),
        }
    except ProviderError as error:
        base["provider_status"] = error.code
        note = (
            "External AI is not configured. Add a server-side Gemini or Groq key."
            if error.code == "unconfigured"
            else "External AI is temporarily unavailable or could not provide a valid answer. Try again later."
        )
        base["answer"] = (
            note
            + "\n\n"
            + (
                base["answer"]
                if personal or base["citations"]
                else "No medical answer was generated."
            )
        )
        return base
