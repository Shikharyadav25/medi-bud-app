# Medi Bud AI Health Companion — 6-to-8 Minute Viva Demonstration Script

**College Mini-Project Examination & Demonstration Walkthrough**  
*Team Members*: Shikhar Yadav, Shivaji Rajawat, Shaurya Gautam, Shaurya Gupta, Shreshth Gupta, Shikhar Dubey.

---

## 1. Timeline & Speaker Handoff

| Time | Speaker & Domain | Demonstration Flow & Screen Actions | Key Technical Concepts to State |
| :--- | :--- | :--- | :--- |
| **0:00 – 1:15** | **Shikhar Yadav**<br>*(Team Lead, Architecture)* | **Architecture & Monorepo Overview**<br>- Show `pnpm-workspace.yaml` and monorepo structure (`apps/web`, `apps/mobile`, `services/api`, `packages/*`).<br>- Show live `/ready` endpoint displaying loaded 384-dim embeddings. | Shared typed contracts (`@medi-bud/contracts`), client SDK (`@medi-bud/api-client`), single identity, and unified backend. |
| **1:15 – 2:30** | **Shivaji Rajawat**<br>*(Web Frontend & UX)* | **Web Experience & Habit Tracking**<br>- Open `http://localhost:3000/dashboard`.<br>- Demonstrate 4-habit transparent counter (+250ml water intake).<br>- Toggle Network Offline in Chrome DevTools: show Offline pill, Dexie.js IndexedDB outbox queue.<br>- Re-enable Network: show automatic sync replay without duplicates. | Next.js 15 App Router, Tailwind CSS v4 design tokens, Dexie.js client outbox, zero health penalties for chronic illness. |
| **2:30 – 3:45** | **Shaurya Gautam**<br>*(Mobile & Native)* | **Mobile Parity & Offline SQLite**<br>- Show Expo app running on mobile simulator/device.<br>- Demonstrate habit logging offline storing records in local `expo-sqlite` database (`medibud_outbox.db`).<br>- Trigger meal plan PDF sharing via native intent. | React Native Expo 57, Expo Router, offline SQLite replay engine, native print/sharing integration. |
| **3:45 – 5:00** | **Shaurya Gupta**<br>*(Backend & API)* | **Lab Report Pipeline & PDF Exporter**<br>- Upload synthetic lab report `Lipid_Panel_Sept2026.pdf`.<br>- Show magic byte validation (`%PDF`), pypdf extraction, canonical normalizer (LDL, HDL, Total Cholesterol).<br>- Demonstrate observation confirmation UI and download 7-day meal plan PDF generated via ReportLab. | File signature security (10MB limit), comparator boundary safety (`< 0.5 mg/L`), ReportLab tabular rendering. |
| **5:00 – 6:15** | **Shreshth Gupta**<br>*(Database & Security)* | **Two-Account Security Isolation & RLS**<br>- Show Supabase PostgreSQL schema with RLS enabled on 100% of user tables.<br>- Run integration test: `pytest tests/integration/test_auth_isolation.py`.<br>- Demonstrate that User B receives HTTP 404 when querying User A's reports or observations. | Cryptographic JWT verification (sub claim derivation), Row-Level Security, partition-isolated storage buckets. |
| **6:15 – 7:30** | **Shikhar Dubey**<br>*(AI, NLP & Evaluation)* | **Grounded Q&A & ML Evaluation Gates**<br>- Ask Medi Bud in `/chat`: *"What does my elevated LDL cholesterol mean?"*<br>- Point out grounded answer with expandable Citation Cards showing Title, Date, Page, and Source Excerpt.<br>- Run `python3 ml/evaluate.py`: show held-out Macro-F1: 0.9119, Recall@5: 1.0000, and 100% abstention on unanswerable queries. | Grounded extractive RAG, hybrid reciprocal rank fusion (RRF), scikit-learn intent classifier, zero-hallucination guardrail. |
| **7:30 – 8:00** | **Shikhar Yadav**<br>*(Team Lead)* | **Emergency Safety Triage & Viva Wrap-up**<br>- Open `/symptoms`: check "Acute crushing chest pain", show instant escalation to Emergency Mode with direct dialer to 112 / 108.<br>- Conclude with honest limitations and open the floor for evaluator questions. | Indian national emergency hotlines (112, 108), deterministic triage rules, college prototype boundary disclosure. |

---

## 2. Emergency Backup & Live Demonstration Tips

1. **If local network or external APIs are unreachable:**
   - Both web and mobile applications include embedded fallback demonstration fixtures (`demo_lipid.pdf`, ICMR guidelines excerpts, and pre-cached OSM facilities). The demonstration will never crash or hang on an evaluator.
2. **If Supabase Auth is offline:**
   - Click **"Use Quick Demo Account"** on the `/login` screen to instantly populate a valid session token and proceed through the full application.
