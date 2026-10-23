# Deployment and release status

For the latest local checks and demonstration scope, see [verification-2026-10-23.md](verification-2026-10-23.md) and [demo_guide.md](demo_guide.md). Historical verification results are dated and should not be treated as fresh live-provider/native validation.

This branch hardens the prototype and redesigns the web application. Passing builds does not certify clinical safety. Do not launch real clinical decision support until an independent clinical/safety review has approved the report extraction, symptom escalation, source material, nutrition content, and intended use.

## Configure the three applications

Copy the example in each application directory to its local environment file. Never send secrets in chat, commit environment files, or prefix a server secret with `NEXT_PUBLIC_` / `EXPO_PUBLIC_`.

| Location            | Variable                                                    | Purpose                                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `services/api/.env` | `ENVIRONMENT=production`                                    | Enforces PostgreSQL, encrypted storage, a real Supabase project, and disabled demo authentication                                                                                   |
| API                 | `DATABASE_URL`                                              | Private PostgreSQL connection string; use the Supabase database connection/pooler details or a private PostgreSQL service, with TLS (`sslmode=require`)                             |
| API                 | `DATA_ENCRYPTION_KEY`                                       | Fernet key protecting persisted health records and original report bytes                                                                                                            |
| API                 | `SUPABASE_URL`                                              | The same project used by both clients                                                                                                                                               |
| API                 | `SUPABASE_JWT_SECRET`                                       | Required only for legacy HS256 signing. New asymmetric Supabase keys are verified against the project's JWKS endpoint                                                               |
| API                 | `SUPABASE_SERVICE_ROLE_KEY`                                 | Server-only administrative key for deleting the Supabase sign-in identity. Without it, API data deletion still succeeds, but identity deletion is explicitly pending administration |
| API                 | `GEMINI_API_KEY`                                            | Needed for meal-photo analysis and scanned/image report extraction. Text-based supported lab PDFs and extractive chat work without it                                               |
| API                 | `GEMINI_MODEL=gemini-2.5-flash`                             | A configurable documented model ID; availability/quota must be tested with your account                                                                                             |
| API                 | `ALLOWED_ORIGINS`                                           | JSON array containing only your deployed web origin(s); no wildcard                                                                                                                 |
| API                 | `ENABLE_DEMO_AUTH=false`                                    | Keep disabled outside disposable local development                                                                                                                                  |
| Web `.env.local`    | `NEXT_PUBLIC_API_URL`                                       | Public HTTPS API origin                                                                                                                                                             |
| Web                 | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project URL and client publishable/anon key, not the service-role key                                                                                                               |
| Web                 | `NEXT_PUBLIC_DEMO_MODE=false`                               | Demo sign-in is also compiled out of production                                                                                                                                     |
| Mobile `.env`       | `EXPO_PUBLIC_API_URL`                                       | Reachable HTTPS API origin; localhost on a phone means the phone itself                                                                                                             |
| Mobile              | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` | The same Supabase project and client key as web                                                                                                                                     |

Generate the encryption key locally in the API environment:

```sh
python -c 'from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())'
```

Store it in your deployment secret manager and backed-up key vault. Losing it loses access to encrypted records. Do not change it without decrypting and re-encrypting existing records through a controlled migration.

Firebase is not used for authentication. The old example's Firebase/demo configuration has been removed.

## Authentication setup

Enable Supabase email/password authentication and email confirmation. Configure your production site URL and permitted email redirect origins in Supabase. Configure transactional email delivery, password policy, recovery delivery, abuse controls, and account enumeration protections in the provider. Both clients now authenticate actual Supabase passwords; a local profile is not a credential.

The API verifies signature, issuer, audience, required expiry/subject claims, UUID identity and authenticated role. It supports ES256/RS256 JWKS and separately configured legacy HS256. Demo tokens require both development mode and explicit `ENABLE_DEMO_AUTH=true`.

## Storage and migration

The canonical API store is `app_records`, with encrypted values and owner checks in API routes. PostgreSQL advisory locks serialize changes for each account; writes involving report metadata, original files and observations commit together. SQLite is a durable local-development alternative and is rejected in production. API-only rate limits and deleted-account tombstones are also durable.

The original prototype used Python process memory. Those values were never durably written and cannot be recovered after the old process exits. No claim is made that old process memory or device profiles were migrated automatically.

Apply Supabase migrations `001` then `002` in a staging project before production. Migration `002` prevents child records claiming a different owner from their parent and adds auth-user foreign keys to legacy typed tables. Existing invalid/orphan rows cause the migration to fail; review and repair them deliberately before retrying. It also denies direct anon/authenticated access to the API's encrypted state tables. The older typed tables remain a legacy schema and are not silently substituted for the API runtime store. Do not mix independent writers into both stores.

The API database credential must have private access to its tables and bypass/own their RLS, while the browser/mobile anon key must have no direct access. Use a dedicated server credential, never a client key, as the database credential. Apply schema changes with a migration credential. The current API also checks/creates its small runtime tables at startup, so its database credential needs that permission; separate migration-only bootstrapping is a future deployment optimization.

Back up the database and encryption key separately. Test restore, ownership isolation and deletion in staging. Use `migrate_state.py` to copy an existing durable local API store into PostgreSQL without overwriting conflicting destination records. Legacy Supabase typed-table records require an explicit mapping migration if they were populated independently.

## Privacy, export and deletion

The account page downloads owner-scoped API data, including originals encoded as base64, and deletes API-held profile, reports, extracted values/chunks, histories, plans, logs, reminders/completions and queued jobs. Existing JWTs for a deleted account are blocked by a durable tombstone. With the server administrative key, the API also requests Supabase identity deletion; failures are reported as pending rather than claiming completion.

Native mobile caches and sessions use OS protected storage with account-specific cache keys. Shared legacy device profiles are discarded. Mobile web health caches stay in memory. Signing out clears active health/chat memory and removes that device's cached profile/health data. Other devices must also sign out or be erased; server deletion cannot physically erase an offline phone. Device-only records are not included in the API export. Device-only habits/profile preferences are not yet a cross-device sync service; report uploads and report review are shared through the API.

Images require consent before being sent to Google Gemini. Supported text PDFs are extracted locally without a provider call. Read and approve your provider's data-use, region and retention terms for the selected account before using real health data. Location search shares the selected coordinates with OpenStreetMap Overpass and retains a bounded in-process result cache for up to 15 minutes. Listings are not medically verified.

Active API records persist until the owner deletes them. The operator must publish a retention schedule for active records, deleted-account tombstones, database backups, identity records, provider processing and operational logs, and configure backup expiry accordingly. The app does not promise that deletion removes data from existing backups or external providers. Do not enable request/response-body logging, token logging or clinical-text telemetry. The supplied API container disables access logs.

## Run and verify

```sh
pnpm install --frozen-lockfile
python3 -m venv .venv
.venv/bin/pip install -r services/api/requirements.lock
pnpm build:web
pnpm build:mobile
pnpm test:contracts
.venv/bin/python -m pytest tests/integration -q
```

For the PostgreSQL integration run, set `DATABASE_URL` to a disposable test database first. Tests insert/delete synthetic users' API data. Never point them at production. For legacy migration ownership/RLS checks, set `SECURITY_TEST_DATABASE_URL` to a separate empty, disposable PostgreSQL database and run `tests/security`.

Run the API from `services/api` so its environment file is loaded. Build the container from the repository root with `services/api/Dockerfile`. Keep it behind HTTPS and a proxy that enforces upload limits and trusted forwarded IPs. Client limits are not a replacement for gateway limits. Limit provider spending/quotas independently of per-account request limits. The generic encrypted-record store currently scans records for several list/export operations; run representative multi-user load and capacity tests before a public rollout.

The `/health` route reports process liveness. `/ready` performs an actual database round trip. `ai_configured` means that a key was supplied; it does not claim that provider quota, permissions or the model have been live-tested. Chat uses shared extractive retrieval from curated sources and confirmed account observations, with emergency rules before retrieval. It does not silently switch to invented generative answers. Photo nutrition and AI report extraction reject malformed output and remain estimates/proposals.

## Remaining launch gates requiring your environment

- Supply real Supabase project/client settings, API database credentials/encryption key, administrative deletion key, and Gemini key through local files or a secret manager.
- Execute migrations and inspect policies in your staging Supabase project; verify signup, email confirmation, refresh, recovery, two actual accounts, deletion and restoration there.
- Exercise live Gemini success, quota exhaustion, invalid key, timeout and representative real/de-identified report layouts with approved test data and provider consent. Automated tests cover mocked provider output and provider-unavailable behavior, not live provider accuracy.
- Build and run a native iOS/Android application to verify camera/file permissions, protected storage, device networking, sign-out/account-switch isolation and report/meal flows. Typechecking does not prove native behavior.
- Complete independent clinical review, dietitian review, security/privacy review, hosting/retention policy, incident response, backup-restore drill, accessibility audit and capacity testing before handling real clinical production use.
- Community publishing and voice input are intentionally unavailable until real services are implemented. No simulated posts, moderation notices or speech are shown as completed work. Reminders are an in-app journal; background/push notifications are not claimed.

Dependency audit currently reports two high-severity, unpatched upstream findings in Expo tooling (`node-forge`, `braces`). Patched Next/PostCSS/UUID/URI-decoding dependencies were upgraded. Keep development servers private, assess the remaining findings against your build/runtime threat model, and track upstream remediation before the mobile release. Audit results can change; rerun them before deployment.

References used for configuration/safety checks: [Supabase signing keys](https://supabase.com/docs/guides/auth/signing-keys), [Supabase JWT claims](https://supabase.com/docs/guides/auth/jwt-fields), [Gemini 2.5 Flash](https://ai.google.dev/gemini-api/docs/models/gemini-2.5-flash), [India ERSS 112](https://112.gov.in/), [NHS chest pain](https://www.nhs.uk/symptoms/chest-pain/), [NHS anaphylaxis](https://www.nhs.uk/conditions/anaphylaxis/).
