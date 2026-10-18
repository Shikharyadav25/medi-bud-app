# Verification record — 16 October 2026

All checks below were run locally. GitHub CI has been added but its result is separate from these local results.

| Check | Result |
| --- | --- |
| Shared TypeScript package builds | Passed |
| Next.js production build, including type validation and static generation | Passed |
| Mobile TypeScript check | Passed |
| Expo web export | Passed; 37 static routes exported |
| Expo SDK dependency compatibility check | Passed after aligning 11 dependencies |
| Workspace peer dependency check | Passed |
| Shared contract tests | 4 passed; removed the previous script that hid failures with `|| true` |
| API integration suite with SQLite | 67 passed |
| Same API suite with local PostgreSQL 14 | 67 passed |
| Legacy parent ownership / API-table RLS migration check | 1 passed in a separate empty local PostgreSQL database |
| Python pinned-dependency vulnerability audit | No known vulnerabilities reported |
| JavaScript production dependency audit | Two high-severity upstream findings remain: node-forge and braces; no patched versions were published in the audit result |
| Git whitespace/error check | Passed |

The API suite includes unauthenticated AI-route rejection, JWT expiry/signature/issuer/role checks, disabled default demos, two-account isolation, malformed PDF rejection, parser label-number/alias/comparator cases, observation review, unconfirmed/forged evidence exclusion, cross-client confirmed report retrieval, download authorization, owner-only exports, deletion and JWT revocation, database restart persistence, encrypted records, migration re-encryption, real database readiness failure, rate limiting, concurrent writes, idempotent/conflicting health and reminder replay, invalid nutrition output, consent requirements, allergen handling and meal combination totals.

Tests still emit a dependency deprecation warning about Starlette's httpx test client. It does not change the passing result and was not hidden.

## Browser verification

Used an isolated loopback-only development API/database and explicit development demo sign-in. All uploaded/report data was synthetic. No real Supabase credentials or Gemini key were available, and no real health records were submitted to external AI services.

Observed through the rendered browser UI:

- Homepage design and mobile-width layout.
- Mobile navigation opening/closing and active-page navigation; closed off-screen navigation is inert after hydration.
- Development demo entry; empty dashboard initially has no fictional reports or vital measurements.
- Water logging and sleep logging, with saved values surviving navigation/API restart.
- Reminder creation and persisted completion.
- Vegetarian meal-plan generation with dairy/peanut exclusions.
- Synthetic PDF upload, correct hemoglobin/HbA1c extraction, explicit review/save, and persisted confirmed state.
- Report-scoped chat returning the confirmed hemoglobin value and an inspectable citation. After retrieval tightening, unrelated test values were absent from that reply.
- Initial symptom guidance makes no “no red flags” clearance claim; selecting a chest-pain warning shows emergency escalation and contact links.
- Nearby care starts without invented facilities and explains the location-sharing requirement.

The browser panel was mobile-width. A desktop-width visual/accessibility audit was not completed. Automated service tests cover provider-outage/error behavior; they do not replace real device permissions, GPS, camera, keychain, or native app testing.

## Not verified / release gates

- Live Supabase signup, email confirmation, password recovery, refresh and administrative identity deletion with the actual project. Their configuration must be tested in staging.
- Actual Supabase migration execution and existing-data reconciliation. The local migration test uses minimal equivalent parent tables; it does not run Supabase's hosted auth/storage services or pgvector installation.
- Live Gemini responses, key validity, model access, quotas or clinical extraction accuracy. Provider-unavailable and mocked malformed-output cases were tested.
- Native iOS/Android builds and on-device execution.
- Container build: Docker was installed but its daemon was not running.
- Full clinical/dietitian review, source revalidation, penetration/accessibility/load testing, backup restore, provider data terms and published retention policy.

Community publishing and voice input are visibly unavailable. Reminder entries do not claim background notifications. Mobile device-only habits/preferences are not a completed cross-device sync service. The account API export excludes device-only caches; mobile sign-out/deletion clears the active device cache. See [production.md](production.md) for exact configuration and remaining operator steps.
