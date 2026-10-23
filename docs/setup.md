# Setup and verification

Use Node >=22.13, pnpm 12.8.1 and Python 3.13.

- For a no-key, synthetic-data demonstration, follow [demo_guide.md](demo_guide.md). It starts an isolated encrypted local database and both web services without changing real configuration.
- For real Supabase authentication, Gemini image features, mobile networking or deployment, follow [production.md](production.md) and each application's `.env.example`. Never put server secrets in public client variables or send secrets in chat.
- Run `pnpm build:web`, `pnpm build:mobile`, `pnpm test:contracts`, and `.venv/bin/python -m pytest tests/integration tests/demo -q` after the installation described in the demo guide.
- PostgreSQL and ownership/RLS migration tests need separate disposable databases. See `.github/workflows/verify.yml` for the reproducible CI setup; never run tests against production health data.

The `/ready` endpoint checks database access. `ai_configured` is a configuration flag, not proof of a valid provider key, live model access or extraction accuracy. Native permission/storage behavior and professional clinical review are separate checks.
