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

Each run creates a new encrypted SQLite database, encryption key and synthetic PDF under ignored `.demo/session-*`. It never changes your real `.env` files or database. These disposable files remain after shutdown for inspection; do not commit or share the encryption key. A new run starts empty, so deleting the demo account cannot break the next demonstration. Development output `.next-demo` is separate from production `.next`.

The launcher disables external AI and real Supabase credentials, even if inherited from your terminal. Demo login is available only in explicitly enabled development builds. The visible account notice identifies synthetic-only use. Real sign-in, mobile sign-in and photo analysis require separately configured providers; see [production.md](production.md).

## Six-minute web walkthrough

1. Open the printed `/login` URL and select **Launch local demo**. Show the empty dashboard: no invented vitals, reports or health score. Add 250 ml water, enter sleep and create/complete a synthetic reminder. Reload to show persistence. Reminders are a journal, not background notifications.
2. Open **Health reports** and upload the `SYNTHETIC-lab-report.pdf` printed by the launcher. Explain that values are proposed, not verified clinical facts. Compare hemoglobin **14.2 g/dL**, HbA1c **6.2%** and LDL **148 mg/dL** against the PDF. Confirm them, save, then download the original report. Values are invented for testing, not a diagnosis.
3. Open **Ask Medi Bud**, select that report if offered and ask **What is my hemoglobin?** Show the exact confirmed value and inspect its citation. Before confirmation the app should not use proposed values as verified evidence. Do not promise “zero hallucination” or clinical accuracy: bounded retrieval reduces risk but still needs review.
4. Open **Meal planner**, select vegetarian preferences and dairy/peanut exclusions, then generate. Inspect multiple days and download the PDF. These are general meal ideas with estimated nutrition, not a personalized therapeutic diet or allergy/cross-contact guarantee.
5. Open **Symptom guide**. Show that the initial state cannot rule out an emergency. Select the chest-pain warning to demonstrate immediate escalation. Do not click a telephone link or place a call during the presentation.
6. Open **Find care**. Explain that facilities appear only after the user deliberately shares location and the external directory responds. Do not show invented nearby listings if location or the service is unavailable. Do not describe directory listings as clinically verified.
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

Run `pnpm build:web`, `pnpm build:mobile`, `pnpm test:contracts`, and `.venv/bin/python -m pytest tests/integration tests/demo -q`. See the dated verification records for checks actually performed and remaining external-service/native/clinical gates. Leave time to run through the demonstration on the presentation machine before the event.
