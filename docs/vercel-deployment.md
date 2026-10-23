# Vercel frontend deployment

The existing Vercel project `medi-bud` points to the separate `Shikharyadav25/Medi-Bud` repository. It was not repointed or redeployed. The new project for this monorepo is **medi-bud-app**, under `shikharyadav25s-projects`.

Public frontend: **https://medi-bud-app.vercel.app**. Initial production deployment `dpl_AdxrubUSwpGrRSBSfTDLaUxKAhkH` reached READY on 23 October 2026. Vercel's remote build passed shared-package compilation, Next.js production build and typechecking. Live homepage and login returned HTTP 200; the unconfigured API returned the intended HTTP 503 with `BACKEND_NOT_CONFIGURED`, no-store and production security headers (no localhost in CSP). Browser inspection confirmed the homepage and its setup notice. Real sign-up/AI/report persistence were not claimed or tested on this unconnected deployment.

Project settings:

- Framework: Next.js; Node.js: 24.x.
- Root directory: `apps/web`, with shared workspace packages available from the repository root.
- Install/build settings are versioned in `apps/web/vercel.json`; they use the repository's pinned pnpm 12.8.1 and build shared packages before Next.js.
- Upload exclusions in `.vercelignore` prevent local environment files, Vercel credentials, SQLite databases, demo data, encryption keys and caches from being uploaded by CLI deployments.

This is a **frontend deployment**, not a completed clinical service launch. Supabase exists according to the owner, but its URL/client settings have not been supplied; configuring it was explicitly deferred. The separate FastAPI API is not hosted or connected. Production has no shared demo authentication, no fictional clinical results, no tunnel to a local service, and no visitor-localhost API fallback. Missing-backend requests return a structured 503; pages show a visible frontend-preview/setup notice.

## Connect services later

In Vercel → `medi-bud-app` → Settings → Environment Variables, set for Production (and Preview only when appropriate):

```dotenv
NEXT_PUBLIC_API_URL=https://your-deployed-api-origin
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-project-public-client-key
NEXT_PUBLIC_DEMO_MODE=false
```

Never put database passwords, Gemini/Groq keys, JWT secrets, encryption keys or a Supabase service-role key in `NEXT_PUBLIC_*`. Redeploy after changing public values: they are compiled into the browser bundle.

Host `services/api` using its supplied Dockerfile behind HTTPS with private PostgreSQL and production settings from [production.md](production.md). Configure only the final web origins in API `ALLOWED_ORIGINS`. Configure Supabase's site URL and allowed email callback/recovery URLs for the final frontend domain. Verify real two-account signup/login/confirmation/recovery and live provider flows with approved test data after wiring the services. Do not use real health records until the safety/privacy/clinical release gates are met.
