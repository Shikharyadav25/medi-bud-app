# Image chat / voice verification — 23 October 2026

## Actually run locally

- `python -m pytest tests/integration tests/demo -q`: **104 passed**, one existing Starlette/httpx deprecation warning.
- Contracts: **4 passed**. Mobile state tests: **6 passed**.
- `pnpm build:web`: passed, 15 static pages. `pnpm build:mobile`: passed shared builds and mobile typecheck.
- API tests cover authenticated access, consent, corrupt/oversized uploads, invalid form values, owner isolation, proposed-only report saves, downloaded normalized original, idempotent saves, estimated meal persistence and subsequent account chat context, discarding, expiry, account deletion/export (including deletion during in-flight analysis), emergency bypass, missing keys, draft cap, payload minimization, Gemini/Groq image request shapes, permission-controlled transient fallback, safety-refusal no-fallback and invalid output.

## Browser checks

On the real isolated demo (`127.0.0.1:3000`), attached an invented JPEG/PNG lab image, verified sending was disabled before consent, and sent after explicit consent. Missing provider keys produced the actual configuration error, with no invented result or report save. Preview/removal controls and the browser's supported dictation controls rendered. No microphone recording, permission grant or speech-recognition accuracy test was performed.

Separately started a temporary loopback-only API/web fixture (`8001`/`3004`) with an in-memory provider stub returning the prominent phrase **SYNTHETIC TEST FIXTURE — not a live AI result**. Verified in the browser: image attach + question + consent → proposed result card → explicit Save → saved feedback → Reports page with `chat-report.jpg`, `review_needed` and hemoglobin `14.2 g/dL` still **proposed**. Both fixture servers were stopped afterwards. This validates the UI/API save workflow, not live model vision quality. The normal demo contains no provider stub.

## Not established

No real Gemini/Groq key was available: live image understanding, accuracy, account model access, latency and quota remain unverified. Browser dictation depends on browser/provider support and the user's microphone permission. Native mobile chat attachment UI was not added; the API is shared and mobile typechecks passed. Successful software tests are not clinical validation. PostgreSQL/security verification is performed separately by the commit's GitHub workflow; consult that run for its result.
