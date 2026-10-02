# Source Audit and Dependency Map: Medi Bud AI Health Companion

**Date:** 2 October 2026  
**Auditor:** Antigravity AI Engineering Team  
**Inspected Reference Sources:**
1. **Mobile Reference:** `https://github.com/Shikharyadav25/medi-bud-app` (commit `33aa9838f1011533d1b8b634837d3f306b286ac1`)
2. **Web Reference:** `https://github.com/Ishan15coder/cureme` (commit `3bb57ff7d50fa72d264eadb00f6324f96563266c`)
3. **Reference Academic Document:** *Third Year Mini Project Report 26-27.docx*

---

## 1. Executive Summary of Audit Findings

A rigorous file-by-file inspection of the mobile repository (`medi-bud-app`) and web repository (`cureme`) reveals that both projects contained prototype UI skeletons and proof-of-concept scripts, but suffered from critical architectural shortcuts, security vulnerabilities, hardcoded mock responses, and synthetic fallbacks.

| Finding Category | Mobile Reference (`medi-bud-app`) | Web Reference (`cureme`) | Status in Rework |
| :--- | :--- | :--- | :--- |
| **Authentication & AuthZ** | In `backend/src/middlewares/authMiddleware.ts`, defaults to `aarav_demo_user` via `x-user-id` header if no bearer token is supplied. No signature verification. | Client-side Firebase auth with unvalidated direct Firestore read/write. | **Replaced**: Real Supabase Auth JWT verification in FastAPI (`iss`, `aud`, `exp`, signature check). Derives owner strictly from sub. Missing/invalid token returns 401. |
| **Document Analysis** | In `backend/src/routes/reportRoutes.ts`, returns hardcoded CBC & Lipid panel values (`Hemoglobin: 14.8`, `LDL: 104`, etc.) regardless of uploaded text. | No document OCR pipeline; prompts Gemini directly via client JS. | **Replaced**: Genuine document parser with pypdf and Tesseract OCR; strict alias/rule normalizer for CBC, glucose, lipid tests; user review/correction step before facts are confirmed. |
| **RAG & Embeddings** | In `backend/src/services/ragService.ts`, uses 64-dim `generatePseudoEmbedding()` (hash bucket algorithm) stored in an in-memory `Map<string, DocumentChunk[]>`. | No RAG pipeline; sends raw conversational prompts to Gemini Flash. | **Replaced**: Genuine local `sentence-transformers/all-MiniLM-L6-v2` generating 384-dim dense vectors, stored in PostgreSQL `pgvector(384)`, combined with PostgreSQL full-text search via Reciprocal Rank Fusion (RRF). |
| **AI Secrets & Safety** | Node.js Express backend directly imports `@google/generative-ai` with loose prompt templates and hardcoded Aarav profile fallbacks. | `lib/gemini.js` exposed `NEXT_PUBLIC_GEMINI_API_KEY` in client bundle, making direct calls to Gemini 2.5 Flash from the browser. | **Replaced**: All LLM and provider keys strictly server-side. Zero client keys. Optional generation adapter with graceful degradation: extractive facts, intent classification, and retrieval function 100% locally without any API key. |
| **Health Scoring & UX** | Mentions ABHA verification, large user trust counts, and clinical readiness in README and onboarding. | In `app/dashboard/page.tsx`, `calcHealthScore` explicitly penalized users: -10 pts per medical condition, -5 pts per medication, -3 pts per allergy. | **Replaced**: Removed all unverified claims (ABHA, 50k users, clinical diagnostics). Replaced negative penalty score with a positive, transparent habit-completion count. Rebranded web app strictly to Medi Bud. |
| **Offline Architecture** | Profile stored in React Native AsyncStorage; no SQLite outbox or offline conflict resolution. | Standard Next.js client; crashes or fails silently when disconnected. | **Replaced**: Bounded offline architecture using SQLite (mobile) and Dexie IndexedDB (web) with append-only local outbox, idempotent mutation replay `(user_id, mutation_id)`. |

---

## 2. Detailed Technical Deficiencies Found

### 2.1 Mobile Backend (`backend/src/`)
1. **Mock Lab Fallback (`backend/src/routes/reportRoutes.ts:18-32`):**
   ```typescript
   // Discovered code in reference:
   const rawText = documentText || `COMPLETE BLOOD COUNT (CBC) & METABOLIC PANEL... Hemoglobin: 14.8 g/dL...`;
   const extractedReport = {
     testResults: [
       { testName: 'Hemoglobin', value: '14.8', unit: 'g/dL', status: 'NORMAL' },
       ...
     ]
   };
   ```
   *Issue:* Real file uploads are discarded or shadowed by hardcoded clinical numbers.
2. **Pseudo-Vector Index (`backend/src/services/ragService.ts:36-50`):**
   ```typescript
   function generatePseudoEmbedding(text: string, dimensions = 64): number[] {
     // Word character hash mod 64
   }
   const vectorStore: Map<string, DocumentChunk[]> = new Map();
   ```
   *Issue:* Semantic retrieval is completely non-functional. Vector store evaporates upon server restart.
3. **Demo Auth Bypass (`backend/src/middlewares/authMiddleware.ts:14-32`):**
   ```typescript
   const demoUserId = (req.headers['x-user-id'] as string) || 'aarav_demo_user';
   req.user = { uid: demoUserId, email: 'aarav@medibud.demo' };
   ```
   *Issue:* Any caller can impersonate any user ID by passing `x-user-id`.

### 2.2 Web Application (`cureme`)
1. **Client-Side Secret Exposure (`lib/gemini.js:14-16`):**
   ```javascript
   const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
   fetch(`https://generativelanguage.googleapis.com/...:generateContent?key=${API_KEY}`, ...)
   ```
   *Issue:* API keys leak directly to public browser network inspection.
2. **Harmful Health Score Logic (`app/dashboard/page.tsx:36-59`):**
   Users with chronic illnesses, necessary medications, or life-threatening allergies are penalized down to low scores, discouraging honest tracking.
3. **Unchecked Third-Party Disclaimers:**
   Web interface contained CureMe branding, disparate design tokens, and unreviewed AI chat outputs lacking source grounding.

---

## 3. Target Dependency Map (Consolidated pnpm Workspace)

### Workspace Organization
```text
medi-bud-app/
├── pnpm-workspace.yaml
├── package.json (root scripts)
├── apps/
│   ├── web/               # Next.js 15 App Router, React 19, Tailwind CSS, Lucide, Dexie
│   └── mobile/            # React Native 0.86 / Expo 57, expo-sqlite, expo-notifications, expo-print
├── services/
│   └── api/               # Python 3.13 FastAPI, Pydantic v2, PyPDF, Tesseract, SentenceTransformers, ReportLab
├── packages/
│   ├── contracts/         # Zod schemas, OpenAPI DTOs, fixtures, type contracts
│   ├── api-client/        # Type-safe client for Web & Mobile
│   ├── design-tokens/     # Shared color palette (HSL/OKLCH), typography, spacing, i18n copy (en/hi)
│   └── safety-content/    # Red-flag clinical questionnaires, reviewed escalation rules
├── supabase/
│   └── migrations/        # PostgreSQL DDL, RLS policies, pgvector(384) index, search functions
├── data/
│   ├── food/              # Curated 40-item Indian food catalogue with verified nutrition/allergens
│   └── knowledge/         # Approved wellness & app help excerpts with provenance manifest
├── ml/
│   ├── data/              # 180+ labeled intent queries (6 classes, grouped splits)
│   ├── train_intent.py    # scikit-learn TF-IDF + LogisticRegression pipeline
│   └── evaluate.py        # Evaluation scripts generating metrics & confusion matrices
└── docs/                  # Architecture, setup, demo scripts, domain ownership, limitations
```

### Dependency Alignment & Resolutions
- **Node Environment:** v22.23.1, pnpm v12.8.1
- **Python Environment:** 3.13.0, FastAPI, `sentence-transformers/all-MiniLM-L6-v2`, `scikit-learn>=1.5.0`, `pypdf>=5.0.0`, `reportlab>=4.2.0`, `supabase>=2.10.0`
- **Mobile Stack:** Expo SDK 57, React Native 0.86, `expo-sqlite`, `expo-notifications`, `expo-image-picker`, `expo-document-picker`, `expo-print`, `expo-sharing`
- **Web Stack:** Next.js 15 App Router, React 19, `dexie` (IndexedDB outbox), Tailwind CSS v4, `lucide-react`
- **Database & Auth:** Supabase Auth, PostgreSQL 15+ with `pgvector` extension and Row Level Security on 100% of user tables.
