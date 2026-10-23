# Follow-up verification: chat, signup, demo report and nearby care

## Implemented

- Explicit local demo now seeds a selectable synthetic report; restore/select is idempotent and forbidden outside the development demo account.
- Shared web/mobile chat reads owner-scoped server context beyond reports: profile, journal summaries/logs, reminders/completions, meals and saved plan. Unknown data is not invented; proposed lab values and client-forged report objects are excluded.
- Opt-in Gemini/Groq text generation for general education and richer account explanations. Relevant account context requires consent; general prompts exclude unrelated records and private account history. Optional fallback is bounded to outages/429/unconfigured primary, not safety refusals or rejected credentials. Keys stay server-side.
- Signup name/password-confirmation UI, confirmation/resend feedback, PKCE callback, password recovery/update and optional configured Google OAuth. Existing signed Supabase JWT verification remains the API identity mechanism.
- Nearby provider/client budgets aligned; healthcare tags and relations included; partial directory errors are not empty success. Non-GPS coordinate/public-area controls, external city/area search, clear outage messaging and map fallback links added.

## Actually run locally

| Check | Result |
| --- | --- |
| API integration + demo tests | 93 passed |
| Contract tests | 4 passed |
| Mobile state regressions | 6 passed |
| Shared builds / Next production build | Passed; 15 static pages including new auth pages |
| Mobile TypeScript check | Passed |
| Expo web export | Passed; 37 routes |
| Git whitespace check | Passed |

Provider tests use synthetic keys and mocked responses. They exercise consent boundaries, relevant-data minimization, general-versus-personal routing, real saved journal totals, missing records, owner isolation, source/numeric rejection, Groq-only selection, Gemini 429 cooldown/fallback permission, rejected credential/safety-block non-fallback, emergency handling and follow-ups. These are not live model-quality evaluations. The existing Starlette/httpx deprecation warning remains visible.

Browser checks actually exercised on a loopback-only synthetic demo:

- Signup UI displays name/email/password/confirmation and explains the absent provider configuration instead of pretending to register a user.
- Preloaded report is visible and the sample-selection button does not create duplicates. Three proposed values can be reviewed/saved and report-scoped natural chat returns confirmed hemoglobin 14.2 g/dL with a citation.
- Logging 250 ml on the dashboard then asking “How much water did I log today?” returns the actual 250 ml journal total and its timezone, not a report-only answer.
- General question with AI permission but no key explicitly reports missing configuration; no fictional medical reply.
- Public New Delhi demo area search uses no personal GPS. The directory outage is visible and both selected-coordinate and city-area Google Maps links appear with recipient disclosure. No fake facility cards are shown.

## External blockers and boundaries

No real Gemini/Groq key or Supabase project credentials were present in the application environment files. Live general AI quality, real provider quota, signup/email delivery/confirmation/recovery/OAuth are therefore not claimed as tested. Add credentials locally as described in [chat-auth-care-setup.md](chat-auth-care-setup.md); do not send secrets in chat. The isolated launcher disables keys unless `--enable-ai` is explicitly supplied, and always disables real signup credentials.

Live directory diagnostics from this machine returned HTTP 406 from the primary Overpass service and timed out against the secondary service, with both GET/POST probes using only public test coordinates. The timeout mismatch and UI handling are fixed, but no assertion is made that the third-party directory is currently reachable or suitable for reliable clinical operations.

Native device testing, hosted Supabase configuration/migrations, clinical/privacy review and the previously documented production release gates remain separate. All work in this follow-up is on `main`, per the user's instruction. CI results for the pushed commit are separate from the local results recorded here.
