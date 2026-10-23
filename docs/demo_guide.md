# Demonstrating Medi Bud

Use synthetic data only. This is a software demonstration, not evidence of clinical safety or a production deployment. The local web demonstration does not require Supabase or Gemini credentials. Do not expose its shared demo identity to a network or tunnel.

## First-time setup

Use Node >=22.13, pnpm 12.8.1 and Python 3.13. From the repository root:

```sh
pnpm install --frozen-lockfile
python3.13 -m venv .venv
.venv/bin/python -m pip install -r services/api/requirements.lock
pnpm build
.venv/bin/python scripts/demo.py
```

On Windows use `.venv\Scripts\python` instead. The launcher is intended for macOS/Linux (process-group shutdown). Keep its terminal open. It waits for both services, prints the login URL and a synthetic PDF path, and stops both services on Ctrl+C. If a port is occupied, use `--api-port 8001 --web-port 3001`; it does not stop unrelated processes.

Each run creates a new encrypted SQLite database/key under ignored `.demo/session-*` and seeds a labeled **SYNTHETIC-demo-report.pdf**. It never changes your real `.env` files or database. Disposable files remain after shutdown for inspection; do not commit or share the key. Each run has a fresh account, so deleting a demo account cannot break the next presentation. Development output `.next-demo` is separate from production `.next`.

By default the launcher disables external AI and real Supabase credentials. To explicitly use your own server-side Gemini/Groq keys for synthetic questions, add them locally and run `scripts/demo.py --enable-ai` with the virtual-environment Python. In-app AI permission is still required. Real Supabase credentials remain disabled in this isolated launcher. See [chat-auth-care-setup.md](chat-auth-care-setup.md) for chat routing, real signup and provider setup, and [production.md](production.md) for release gates.

## Six-minute web walkthrough

1. Open `/login` and select **Launch local demo**. The dashboard has a labeled synthetic report, not invented real-patient vitals or a clinical health score. Add 250 ml water, enter sleep and create/complete a synthetic reminder. Reload to show persistence. Reminders are a journal, not background notifications.
2. Open **Health reports** and select **SYNTHETIC-demo-report.pdf**, or click **Load / select synthetic report**. Values are proposed, not verified clinical facts. Compare hemoglobin **14.2 g/dL**, HbA1c **6.2%** and LDL **148 mg/dL** against the downloadable original. Confirm and save. These are invented test values, not a diagnosis. Manual file upload remains available.
3. Open **Ask Medi Bud**, select that report if offered and ask **What is my hemoglobin?** Show the exact confirmed value and inspect its citation. Before confirmation the app should not use proposed values as verified evidence. Do not promise “zero hallucination” or clinical accuracy: bounded retrieval reduces risk but still needs review.
4. Open **Meal planner**, select vegetarian preferences and dairy/peanut exclusions, then generate. Inspect multiple days and download the PDF. These are general meal ideas with estimated nutrition, not a personalized therapeutic diet or allergy/cross-contact guarantee.
5. Open **Symptom guide**. Show that the initial state cannot rule out an emergency. Select the chest-pain warning to demonstrate immediate escalation. Do not click a telephone link or place a call during the presentation.
6. Open **Find care**. Use the public demonstration area without sharing actual GPS, or deliberately choose a location. Directory listings require a live provider response. If unavailable, show the clear error and external map/area search links; never invent nearby facilities or claim listings are clinically verified.
7. Open **Your account** to demonstrate profile editing and JSON export. Optionally delete the synthetic account at the end; it revokes that session. Restart the launcher to demonstrate again.

## Failure demonstrations

- Provider/API failure must produce an error, never fabricated clinical results. The integration suite covers these paths. For a manual API-outage UI check, run web/API separately: the combined launcher intentionally shuts down both if either stops.
- Try a non-PDF text file or corrupt PDF: upload must fail visibly. Never upload real health data to test this.
- Try asking for a diagnosis or information absent from confirmed reports: explain abstention/uncertainty, not a clinical guarantee.
- If a photo feature is shown, explain that it is intentionally unavailable in this no-key demo. Do not present a mocked provider reply as live AI.

## Mobile demonstration is a separate setup

Mobile uses genuine Supabase authentication; the local web demo token is not a mobile login. Configure `apps/mobile/.env` and a reachable API with the same Supabase project using [production.md](production.md), then run `pnpm dev:mobile`. Use HTTPS for release builds. A phone's localhost is the phone, not your computer.

Only demonstrate native camera, protected storage, sharing and permission behavior after testing on the actual device. Expo web export and TypeScript checks do not establish native runtime readiness. Community publishing and voice input are intentionally unavailable; device-only preferences/habits are not full cross-device sync. No fictional mobile dashboard or offline fallback medical answer should be presented.

## Before presenting

Run `pnpm build:web`, `pnpm build:mobile`, `pnpm test:contracts`, `pnpm test:mobile`, and `.venv/bin/python -m pytest tests/integration tests/demo -q`. See the dated verification records for checks actually performed and remaining external-service/native/clinical gates. Leave time to run through the demonstration on the presentation machine before the event.
