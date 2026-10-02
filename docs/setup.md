# Medi Bud AI Health Companion — Setup & Verification Guide

## 1. System Prerequisites

- **Node.js**: v20.x or v22.x LTS
- **pnpm**: v9.x or v10.x (`npm install -g pnpm`)
- **Python**: 3.11, 3.12, or 3.13
- **Git**: For version management

---

## 2. Quickstart Installation

### Step 1: Install Monorepo Dependencies
```bash
# From the repository root
pnpm install
```

### Step 2: Build Shared Packages
Build design tokens, safety content, typed contracts, and the API client:
```bash
pnpm --filter @medi-bud/design-tokens build
pnpm --filter @medi-bud/safety-content build
pnpm --filter @medi-bud/contracts build
pnpm --filter @medi-bud/api-client build
```

---

## 3. Running Services Locally

### Step 3: Run the FastAPI Backend
```bash
# Terminal 1 (from services/api directory)
cd services/api
python3 -m uvicorn main:app --port 8000 --reload
```
- Health Check: `http://127.0.0.1:8000/health`
- Readiness & Model Status: `http://127.0.0.1:8000/ready`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### Step 4: Run the Transactional Worker Daemon (Optional)
```bash
# Terminal 2 (from services/api directory)
cd services/api
python3 worker.py
```

### Step 5: Run the Next.js 15 Web Application
```bash
# Terminal 3 (from repository root)
pnpm --filter web dev
```
- Open `http://localhost:3000` in your browser.

### Step 6: Run the React Native Expo Mobile App
```bash
# Terminal 4 (from repository root)
pnpm --filter @medi-bud/mobile start
```
- Press `w` for Expo Web, `a` for Android Emulator, or `i` for iOS Simulator.

---

## 4. Verification Checklists & Automated Tests

### 1. End-to-End Integration Test Suite
Executes all 19 verification tests across security isolation, token auth, report parsing, offline sync idempotency, and meal planning:
```bash
python3 -m pytest tests/integration -v
```

### 2. Machine Learning Intent Classifier & RAG Evaluation
Verifies Intent Macro-F1 ($\ge 0.80$), Retrieval Recall@5 ($\ge 0.80$), and 0% Hallucination Abstention:
```bash
python3 ml/evaluate.py
```

### 3. Web Application Production Compilation
Verifies all 11 Next.js routes, TypeScript validity, and Tailwind CSS v4 styling:
```bash
pnpm --filter web build
```
