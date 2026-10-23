# Verification — 23 October 2026

The previously missing local checkout was restored from GitHub branch `fix/production-hardening-ui-20261016`, commit `de6cdd6`. That commit contains the earlier hardening/redesign work. No synced project sources or existing local work were overwritten.

## Fresh checks on this machine

| Check | Result |
| --- | --- |
| Frozen workspace install and supply-chain policy verification | Passed |
| Shared TypeScript builds and web production build | Passed; 12 static pages generated |
| Mobile TypeScript check | Passed |
| Expo web export | Passed; 37 routes, after dependency updates/removing unused notifications package |
| Expo SDK compatibility check | Passed after patch alignment |
| Workspace peer check | Passed |
| Contract tests | 4 passed |
| Mobile state ownership / daily rollover regression tests | 6 passed; actual store code with deterministic dependency mocks, not native-device testing |
| API integration + demo-launcher regressions | 70 passed with SQLite |
| Python dependency consistency | Passed |
| Pinned Python dependency security audit | No known vulnerabilities after upgrading certifi, Pillow and pypdf |
| JavaScript production dependency audit | 2 high findings remain in upstream node-forge/braces; no published fixes in the audit result |
| Historical ML benchmark | Ran; now explicitly labeled a synthetic substring-retrieval experiment, not production abstention/clinical validation |

The initial fresh Python audit reported 37 findings across three packages. Patched versions are pinned in `requirements.lock`: certifi 2026.10.19, Pillow 13.0.0 and pypdf 6.21.1. The final 70-test suite was rerun after those upgrades and the restart-port regression fix. The dependency's Starlette/httpx deprecation warning is still visible; it was not suppressed. Audit coverage is not a penetration test or a guarantee of absence of vulnerabilities.

Expo recommended five patch releases. Four were aligned; the fifth was the unused `expo-notifications` dependency, which had no imports or configured functionality. It was removed instead of retaining an unnecessary native module or bypassing the package manager's minimum-release-age protection. No release-age exception remains in workspace configuration. Background notifications are still not implemented or claimed.

## Browser checks actually exercised

An explicit local development demo, loopback-only API, separate encrypted SQLite database and generated **synthetic** PDF were used. No real health data, location, Supabase secrets or Gemini credentials were supplied.

- Demo entry and empty initial dashboard; water and sleep saves, reminder creation/completion, persistence across reload.
- Mobile navigation, visible synthetic-account notice/account/sign-out controls, desktop layout at 1440×900 and narrow report layout at 375×812.
- Synthetic PDF upload: hemoglobin 14.2 g/dL, HbA1c 6.2%, LDL 148 mg/dL; proposed values, explicit confirmation/save, resulting ready state.
- Original report download through the browser; downloaded bytes matched the uploaded synthetic file.
- Report-scoped question returned only the confirmed hemoglobin 14.2 result with an expandable source excerpt.
- Vegetarian meal ideas excluding dairy/peanuts, substantive lunch/dinner combinations, day-two detail selection, actual plan PDF download.
- Initial symptom uncertainty and immediate chest-pain escalation. No emergency call was placed.
- Nearby care's location-sharing explanation and no fabricated facilities. GPS was not requested or transmitted.
- Account profile save with synthetic name, JSON export download, deletion disabled until explicit confirmation text.
- Production login page hides local demo and disables real sign-in when Supabase is unconfigured.
- Deliberately stopped the API while serving web independently: reports showed a connection error; chat returned “The health service is unavailable” with no invented medical interpretation or citations.

The launcher, `scripts/demo.py`, provides a new encrypted database/key and a labeled sample PDF each run, disables external provider credentials, waits for readiness, binds only to loopback and shuts down only its own child servers. See [demo_guide.md](demo_guide.md) for the reproducible presentation path.

The launcher was actually started, interrupted and verified to shut down both owned servers, then restarted with a fresh session. Invalid overlapping ports were rejected before startup. Test-created sample downloads were retained in the normal Downloads folder; they contain synthetic data only.

## Additional mobile privacy fixes

Delayed cache/profile hydration and report responses are discarded after sign-out/reset/account changes. Health snapshots are bound to their originating owner instead of whichever session finishes resolving later. Signed-out profile identity is cleared immediately. Daily journal entries also roll over when resuming the app, while active, or before logging; reports are retained. Six deterministic regression tests exercise these boundaries via `pnpm test:mobile`. Native Keychain/Keystore, permissions and real SDK integration still require device testing.

## Hosted verification

[GitHub Actions run 39959198506](https://github.com/Shikharyadav25/medi-bud-app/actions/runs/39959198506) passed for commit `06d6200`: builds, SDK compatibility, contracts, 70 SQLite/demo tests, the 67-test PostgreSQL integration suite and the separate ownership/RLS migration check. This establishes a fresh CI PostgreSQL result, not a live hosted Supabase migration result. The subsequent mobile-only privacy changes have their own new CI run; check the PR's latest commit status rather than treating the earlier green run as proof of later changes.

## Still separate / not verified here

- Local PostgreSQL/migration rerun: local binaries are incompatible with this machine's CPU and Docker's daemon is not running. Fresh hosted CI PostgreSQL/ownership checks passed as recorded above, but this is not the actual Supabase staging environment.
- Live Supabase signup, confirmation/recovery email, refresh, hosted migrations/storage/RLS and administrative identity deletion.
- Live Gemini key validity, quota, output quality and clinical extraction accuracy.
- Native iOS/Android builds, device camera/files/location/protected storage/networking and permission behavior.
- Container image build; full offline UI, accessibility, security/load and backup/restore audits.
- Professional clinical/dietitian review, privacy/retention/incident-response policies and deployment approval.

The demonstrated local web workflow is not a claim that every external/native feature is production-ready. Do not deploy real clinical decision support based on these checks alone. Exact environment names and operator gates are in [production.md](production.md).
