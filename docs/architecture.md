# Medi Bud AI Health Companion — Architecture Specification

## 1. System Overview

Medi Bud is a unified, cross-platform health companion designed as a demonstrable college engineering prototype. It provides a synchronized health intelligence layer across a Next.js 15 web client and a React Native Expo 57 mobile application, serviced by a shared Python 3.13 FastAPI backend and PostgreSQL / Supabase storage.

```
+-------------------------------------------------------------------------------+
|                                Client Tier                                    |
|   Next.js 15 App Router (Web)              React Native Expo 57 (Mobile)      |
|   Dexie.js IndexedDB Outbox                expo-sqlite Offline Outbox         |
|   Tailwind CSS v4                          Expo Router & Mobile UI            |
+-----------------------+----------------------------------+--------------------+
                        |                                  |
                        +-----------------+----------------+
                                          | HTTPS / REST
                                          v
+-------------------------------------------------------------------------------+
|                            Backend Services Tier                              |
|                              FastAPI Monolith                                 |
|                                                                               |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  |   Auth & Security  |  |   Report Parser    |  |  Safety Red-Flag Gate   |  |
|  | Supabase JWT HS256 |  | Magic Bytes & pypdf|  | Emergency Evaluator     |  |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  | Intent Classifier  |  | Hybrid Retrieval   |  | 7-Day Indian Planner    |  |
|  | TF-IDF + LogReg    |  | MiniLM-L6 + BM25   |  | ICMR-NIN IFCT + ReportLab|  |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  +--------------------+  +--------------------+  +-------------------------+  |
|  | Outbox Sync Engine |  | Overpass Care API  |  | Transactional Worker    |  |
|  | Idempotent Replay  |  | 15-min OSM Cache   |  | Lease Recovery Daemon   |  |
|  +--------------------+  +--------------------+  +-------------------------+  |
+-------------------------------------------------------------------------------+
                                          |
                                          v
+-------------------------------------------------------------------------------+
|                             Persistence Tier                                  |
|                      PostgreSQL 15+ / Supabase Storage                        |
|  - Row Level Security (RLS) enabled on 100% of user tables                     |
|  - pgvector (384 dimensions) for semantic report & wellness chunk index       |
|  - GIN full-text search index for lexical token retrieval                     |
|  - Partitioned object storage bucket: reports/{user_id}/{filename}            |
+-------------------------------------------------------------------------------+
```

---

## 2. Authentication & Security Architecture

1. **Identity & Token Verification**:
   - Authentication is powered by Supabase Auth (email/password).
   - The FastAPI backend validates every protected request in `auth.py` by decoding the JWT signature (`HS256`/`RS256`), checking expiry (`exp`), and audience (`authenticated`).
   - The user identity is strictly extracted from the token's `sub` claim. Headers or client-supplied user parameters are never trusted.

2. **Row-Level Security (RLS)**:
   - Every user table (`profiles`, `reports`, `report_observations`, `health_logs`, `reminders`, `saved_plans`, `conversations`) enforces `auth.uid() = user_id`.
   - Direct access without an authenticated role is blocked by PostgreSQL policies.

3. **Storage Security**:
   - Storage buckets isolate uploaded PDFs under `reports/{user_id}/`. Policies prevent cross-tenant object access.

---

## 3. Report Extraction & Grounded Retrieval Pipeline

```
[ Lab Report (PDF/PNG/JPEG) ]
              |
              v (File Signature Check: %PDF, \x89PNG, \xFF\xD8\xFF)
[ Validation & Normalizer ] ---> [ Extraction: pypdf ]
              |
              +---> [ Canonical Normalizer ] ---> [ Proposed Observations ]
              |                                            |
              |                                            v
              |                             [ User Verification / Confirm ]
              v
[ Embedding & Chunking ]
              |
              v (sentence-transformers/all-MiniLM-L6-v2)
[ 384-dim Dense Chunks ] + [ GIN Lexical Tokens ]
              |
              v
[ Hybrid Reciprocal Rank Fusion (RRF) Retrieval ]
              |
              v (Intent Classification: TF-IDF + LogisticRegression)
[ Grounded Answer Generation with Explicit Citations (Source, Page, Excerpt) ]
```

---

## 4. Offline Sync Architecture (Outbox Pattern)

Both web and mobile clients support resilient offline tracking:

1. **Client Storage**:
   - Web: `Dexie.js` IndexedDB database storing pending mutations.
   - Mobile: `expo-sqlite` database storing pending mutations.
2. **Mutation Structure**:
   - `mutation_id` (UUIDv4 generated on device).
   - `entity_type` (`health_log`, `reminder_completion`).
   - `payload_hash` (deterministic SHA-256 hash).
   - `occurred_at` and `timezone`.
3. **Replay & Idempotency**:
   - When online connectivity is re-established, pending mutations are sent in a batch to `/v1/sync/logs`.
   - The backend checks `(user_id, mutation_id)`.
   - If previously applied with the same hash: returns `status: "applied"` (idempotent, no duplicates).
   - If previously applied with a conflicting hash: returns `status: "conflict"` with 409 semantics.
