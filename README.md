# MEDI BUD AI HEALTH COMPANION

> **Understand your lab reports, ground your health discussions, and build everyday wellness habits.**  
> *A demonstrable college engineering prototype monorepo with web, mobile, and shared Python intelligence.*

---

## 🏛 Project Architecture & Monorepo Structure

Medi Bud is architected as an integrated monorepo powered by `pnpm` workspaces:

```
medi-bud-app/
├── apps/
│   ├── web/                        # Next.js 15 App Router, React 19, Tailwind CSS v4, Dexie.js outbox
│   └── mobile/                     # React Native Expo 57, Expo Router, expo-sqlite outbox
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
│   └── evaluation_report.json      # Macro-F1 (0.9119), Recall@5 (1.0000), 100% abstention
├── tests/
│   └── integration/                # 19 Pytest integration tests (security, sync, parsing, diet)
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
   - Grounded extractive answers strictly sourced from verified reports and validated health archives.
   - Interactive citation cards showing Document Title, Date, Page, and Exact Quoted Excerpt.
   - 100% abstention on unanswerable clinical queries (zero hallucination).
3. **Transparent Habit Tracking & Offline Outbox**:
   - Tracks water, sleep, physical activity, and user-entered reminders.
   - Transparent 4-habit target counter with zero penalties for chronic conditions.
   - Offline mutation queue via Dexie.js (Web) and SQLite (Mobile) with idempotent server replay.
4. **Deterministic 7-Day Indian Meal Planner**:
   - Calibrated against ICMR-NIN Indian Food Composition Tables (IFCT).
   - Strict declared allergen exclusion (peanuts, dairy, gluten, soy, mustard) and vegetarian filtering.
   - One-tap printable PDF generation via ReportLab backend export.
5. **Red-Flag Symptom Guidance & Emergency Triage**:
   - Deterministic evaluation identifying acute clinical red flags (chest pain, stroke signs, breathing distress).
   - Direct emergency dialer for verified Indian public hotlines (`112`, `108`, `102`, `1800-116-117`).
6. **Nearby Care Discovery**:
   - Proxies OpenStreetMap Overpass API for verified hospitals, clinics, and pharmacies within 5 km.
   - In-memory 15-minute caching and turn-by-turn navigation links.

---

## 👥 Domain Ownership Matrix

| Member | Roll Number | Primary Domain | Core Deliverable |
| :--- | :--- | :--- | :--- |
| **Shikhar Yadav** | 2401640100930 | **Team Lead, Architecture & Integration** | Monorepo structure, shared contracts, viva flow orchestration. |
| **Shivaji Rajawat** | 2401640100933 | **Web Frontend & UX** | Next.js 15 App Router, Dexie.js outbox, observation review UI. |
| **Shaurya Gautam** | 2401640100918 | **Mobile & Native Features** | Expo Router mobile app, SQLite offline outbox, PDF sharing. |
| **Shaurya Gupta** | 2401640100920 | **Backend & API** | FastAPI modular monolith, transactional worker, ReportLab exporter. |
| **Shreshth Gupta** | 2401640100967 | **Database, Security & Deployment** | Supabase PostgreSQL schema, RLS 100% enforcement, tenant isolation. |
| **Shikhar Dubey** | 2401640100928 | **AI, NLP & Evaluation** | TF-IDF + LogisticRegression intent classifier, dense vector RAG. |

---

## ⚡ Quickstart Execution

```bash
# 1. Install dependencies and compile shared packages
pnpm install
pnpm build

# 2. Run the FastAPI Backend (Terminal 1)
cd services/api && python3 -m uvicorn main:app --port 8000 --reload

# 3. Run the Next.js Web App (Terminal 2)
pnpm --filter web dev

# 4. Run the Mobile App (Terminal 3)
pnpm --filter @medi-bud/mobile start

# 5. Run the Integration Verification Suite (19 tests)
python3 -m pytest tests/integration -v
```

---

## ⚠️ Academic Disclaimer

Medi Bud is a college engineering prototype designed for informational and educational health comprehension. It does not provide medical diagnosis or treatment. In any medical emergency, call 112 or 108 immediately.
