# Chat, signup, sample reports and nearby care

For image attachments, review/save behavior and optional browser dictation, see [chat-images-voice.md](chat-images-voice.md).

## Selectable synthetic report

`.venv/bin/python scripts/demo.py` now seeds one **SYNTHETIC-demo-report.pdf** in the explicit local demo account. Open Health reports and select it. The **Load / select synthetic report** control restores/selects the same sample without duplicate uploads. Extracted hemoglobin 14.2 g/dL, HbA1c 6.2% and LDL 148 mg/dL are invented test values; review/confirm them before account Q&A uses them. No real user account is seeded. The sample endpoint returns 404 outside explicitly enabled development demo authentication.

## Chat behavior

- **My saved app data** reads owner-scoped server profile, confirmed lab observations, report review metadata, journal summaries/logs, reminders/completions, logged meals and saved meal ideas. Missing fields are not guessed. Today’s water/activity totals are computed from actual saved entries, with the displayed log timezone.
- **General medical education** can use a text-generation provider for broader questions. It does not transmit unrelated account records or prior private-account conversation. Generated education is not diagnosis, prescribing or a verified medical reference.
- **Auto-detect** handles common personal-data versus general questions. Select the context explicitly for ambiguous questions.
- External generation is opt-in. Account generation can transmit relevant saved health records, as explained beside the checkbox. A separate checkbox allows the configured fallback provider. There is no fallback to bypass content-safety refusals or invalid credentials. Unavailability never creates a fictional answer.
- Citations to app records are assembled by the server, not invented by the model. Unrecognized source IDs and newly invented numeric values in account answers are rejected. This is a guardrail, not proof of clinical correctness.
- Device-only mobile caches/preferences are not automatically server context. Mobile chat uses the same server workflow and explicitly describes that boundary. Only reviewed report values, not raw unconfirmed report chunks, are sent as patient evidence.

The old chat only returned matching excerpts; it did not use Gemini to answer general questions. General generation now exists but **needs a real provider key**. No provider key is bundled with this repository, and configuring a key is not proof of model quality or available quota.

## Configure Gemini or Groq locally

Set these in `services/api/.env` or your server secret manager, never client variables and never chat:

```dotenv
# Use either provider, or both if you want permission-controlled fallback.
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
GROQ_API_KEY=
GROQ_MODEL=openai/gpt-oss-20b
CHAT_PROVIDER=auto
CHAT_FALLBACK_PROVIDER=groq
```

`auto` chooses configured Gemini first, otherwise Groq. To prefer Groq with optional Gemini fallback, set `CHAT_PROVIDER=groq` and `CHAT_FALLBACK_PROVIDER=gemini`. Groq text chat does not replace Gemini’s existing meal-photo/image-report implementation. Both services have account/model-dependent quotas; fallback is not unlimited service or a way to bypass a provider’s limits. A 429 triggers a bounded cooldown, not a retry storm.

Create a key in your own provider account. An assistant cannot supply a private key owned by you or accept provider/billing terms on your behalf. For the synthetic demo to use locally configured keys, explicitly run:

```sh
.venv/bin/python scripts/demo.py --enable-ai
```

The default launcher deliberately disables external AI. Even with `--enable-ai`, the in-app permission checkbox is required. Do not enter real health data in the shared local demo. Real Supabase login remains disabled in that isolated launcher.

Provider references: [Gemini generateContent](https://ai.google.dev/api/generate-content), [Gemini quotas](https://ai.google.dev/gemini-api/docs/rate-limits), [Groq API](https://console.groq.com/docs/api-reference), [Groq models](https://console.groq.com/docs/models), [Groq rate limits](https://console.groq.com/docs/rate-limits).

## Real signup and authentication

Email/password signup and signed Supabase JWT verification are implemented, not a local-password imitation. This change adds name/confirmation fields, clear confirmation feedback, resend, password recovery/update pages and an OAuth callback. Optional Google OAuth uses Supabase rather than a second unrelated identity system.

No actual Supabase project credentials were present in this local checkout during implementation. To enable real accounts:

1. Configure `services/api/.env`: `SUPABASE_URL`; legacy HS256 projects also need `SUPABASE_JWT_SECRET`. Asymmetric projects use the project’s JWKS. Follow [production.md](production.md) for private PostgreSQL, encryption and production settings.
2. Configure `apps/web/.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_DEMO_MODE=false`. The API and clients must use the same Supabase project. Never use a service-role key in the browser.
3. Enable email/password and confirmation/recovery email delivery in Supabase. Configure SMTP, site URL and allowed redirect URLs for `/auth/callback` and `/auth/update-password` on your exact web origins. For local web this might be `http://127.0.0.1:3000`; deployed origins must use HTTPS. PKCE links should finish in the same browser that initiated them.
4. If desired, configure Google’s OAuth credentials/consent screen and the Google provider in Supabase, then set `NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED=true`. The button is hidden otherwise.
5. Start the regular API/web services with these environment files, **not** the isolated synthetic demo launcher. Validate signup, confirmation, signin, refresh, recovery and signout in your staging project. Do not use real health records for these tests.

See [Supabase password auth](https://supabase.com/docs/guides/auth/passwords) for provider-side configuration. Auth UI/type/mock tests do not establish that your actual email delivery or OAuth console is configured.

## Nearby care

The original page could time out in 15 seconds while the backend tried two 20-second providers. The client and provider budgets now fit together, directory remarks/timeouts are treated as errors, and searches include healthcare tags plus relations as well as amenity nodes/ways. Category changes perform category-specific searches.

GPS still depends on browser permission and support; it may be unavailable in an embedded browser. There are now manual coordinate fields and a button for a **public central-New-Delhi demonstration area**, explicitly not your location. No location is silently inferred. Search coordinates are shared with the directory provider; they are not saved as your profile location.

During live diagnosis, the primary public directory returned HTTP 406 and the secondary timed out from this machine. Code cannot guarantee a third-party public service’s availability. The page reports that honestly and offers a Google Maps search link for the selected area, clearly identifying the additional recipient. No fabricated or stale “nearby” records are substituted. Do not treat directory emergency tags, opening times or listings as verified availability: call facilities directly. This app is not an emergency dispatch service.

Production care discovery needs an appropriately provisioned directory provider with an availability agreement or your own supported infrastructure. Public service terms explicitly provide no critical-service reliability guarantee: [Private.coffee Overpass](https://overpass.kumi.systems/).
