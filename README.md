# MEDI BUD AI HEALTH COMPANION

Production hardening, environment setup, verification limits, data lifecycle and remaining release gates are documented in [docs/production.md](docs/production.md). Clinical production use requires independent professional review; a successful build is not clinical validation.

For the no-key, synthetic-data presentation, follow [the demo guide](docs/demo_guide.md). After installing dependencies and building shared packages, `.venv/bin/python scripts/demo.py` starts an isolated loopback-only demonstration.

For selectable demo reports, context-aware Gemini/Groq chat, real signup/email recovery and nearby-care troubleshooting, see [chat/auth/care setup](docs/chat-auth-care-setup.md).

> **Understand your lab reports, ground your health discussions, and build everyday wellness habits.**  
> _A demonstrable college engineering prototype monorepo with web, mobile, and shared Python intelligence._

---

## 🏛 Project Architecture & Monorepo Structure

Medi Bud is architected as an integrated monorepo powered by `pnpm` workspaces:

```
medi-bud-app/
├── apps/
│   ├── web/                        # Next.js 15 App Router, React 19, Tailwind CSS v4, Dexie.js outbox
│   └── mobile/                     # React Native Expo 57, Expo Router, protected owner-scoped outbox
├── services/
│   └── api/                        # Python 3.13 FastAPI modular monolith & transactional worker
├── packages/
│   ├── contracts/                  # Shared Zod schemas, TypeScript DTOs, and 5 synthetic fixtures
│   ├── design-tokens/              # Unified HSL/OKLCH color system and bilingual copy (EN/HI)
│   ├── safety-content/             # Versioned red-flag questionnaire and verified emergency hotlines
│   └── api-client/                 # Typed TypeScript API client SDK with bearer token injection
├── ml/
│   ├── data/                       # 288 labeled utterances across 72 paraphrase clusters
│   ├── train_intent.py             # Scikit-learn TF-IDF + LogisticRegression pipeline
│   ├── evaluate.py                 # Retrieval & intent evaluation harness
│   └── evaluation_report.json      # Historical experimental metrics, not clinical validation
├── tests/
│   └── integration/                # Security, sync, parsing, diet and privacy regression tests
└── docs/
    ├── ownership.md                # 6-member domain ownership matrix & viva responsibilities
    ├── architecture.md             # Tiered architecture, security model, and offline sync
    ├── setup.md                    # Step-by-step local execution guide
    ├── demo.md                     # 6-8 minute viva demonstration walkthrough script
    └── limitations.md              # Academic engineering boundary disclosure
```

---

## 🚀 Key Prototype Capabilities

1. **Lab Report Extraction & Observation Review**:
   - Validates file signatures (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`), 10MB limit, 20-page limit.
   - Normalizes CBC, Blood Glucose, and Lipid biomarkers.
   - Interactive human-in-the-loop review table to confirm or reject values before AI grounding.
2. **Cited Health Q&A**:
   - Extractive answers from user-confirmed observations and curated educational sources.
   - Interactive citation cards showing Document Title, Date, Page, and Exact Quoted Excerpt.
   - Explicit uncertainty and abstention when evidence is absent; no zero-hallucination guarantee.
3. **Transparent Habit Tracking & Offline Outbox**:
   - Tracks water, sleep, physical activity, and user-entered reminders.
   - Transparent 4-habit target counter with zero penalties for chronic conditions.
   - Owner-scoped replay queues with idempotent server replay; device-only mobile habits/preferences are not full cross-device sync.
4. **Deterministic 7-Day Indian Meal Planner**:
   - Estimated nutrition for general wellness meal ideas; requires dietitian review before clinical use.
   - Ingredient-based declared allergen and vegetarian filters, not a cross-contact or allergy safety guarantee.
   - One-tap printable PDF generation via ReportLab backend export.
5. **Red-Flag Symptom Guidance & Emergency Triage**:
   - Deterministic evaluation identifying acute clinical red flags (chest pain, stroke signs, breathing distress).
   - Emergency contact links; initial/no-match guidance never rules out an emergency.
6. **Nearby Care Discovery**:
   - Queries OpenStreetMap Overpass after deliberate location sharing; listings are not clinically verified.
   - In-memory 15-minute caching and turn-by-turn navigation links.

## ⚡ Quickstart Execution

```bash
# Use Node >=22.13, pnpm 12.8.1 and Python 3.13
pnpm install --frozen-lockfile
python3.13 -m venv .venv
.venv/bin/python -m pip install -r services/api/requirements.lock
pnpm build

# Launch both services with explicit local demo auth and synthetic data only
.venv/bin/python scripts/demo.py

# Run verification separately; external/native/clinical checks are separate gates
.venv/bin/python -m pytest tests/integration tests/demo -q
pnpm test:contracts
pnpm build:web
pnpm build:mobile
```

---

## ⚠️ Academic Disclaimer

Medi Bud is a college engineering prototype designed for informational and educational health comprehension. It does not provide medical diagnosis or treatment. In any medical emergency, call 112 or 108 immediately.
