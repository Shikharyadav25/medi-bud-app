# MEDI BUD — "Your Health, Understood"
### AI-Powered Personalized Mobile Health Companion for Indian Users

**MEDI BUD** is a production-quality MVP mobile application built with **React Native (Expo SDK 57)**, **TypeScript**, **Expo Router**, **Cloud Firestore & Storage architecture**, and **Google Gemini API**. It provides an empathetic, personalized health companion designed specifically for Indian lifestyle patterns, featuring a unified **Health Context Engine**, multimodal meal scanning, **RAG-powered** medical lab report analysis, a 7-day personalized Indian diet planner with PDF export, community wellness networks, and OpenStreetMap nearby healthcare discovery.

---

## 📱 Key Features & Capabilities

1. **Four-Screen Immersive Onboarding**:
   - **Screen 1 (Splash)**: `#0A0A0A` dark aesthetic, abstract pulse/heartbeat motif in slate blue (`#2B3A55`), verified security badges, trusted by 50,000+ users.
   - **Screen 2 (Welcome / Value Prop)**: Soft sky gradient (`#FFFFFF` → `#EAF2FB`), rounded serif headline, three-column feature cards (*Track vitals*, *Get insights*, *Build habits*), and full-width `#2B2B2B` CTA.
   - **Screen 3 (Health Data)**: ABHA Health ID & phone verification, edit triggers, and encrypted health data security guarantee.
   - **Screen 4 (Home + Persistent AI Assistant)**: Dimmed health dashboard with Medi Bud Health Score `82/100` behind a persistent draggable bottom sheet with sparkle AI icon, suggestion chips, and disclaimer.

2. **Central Health Context Engine**:
   - Aggregates structured Firestore data (profile, goals, conditions, allergies, medications, daily vitals, hydration, workouts, sleep, mood) with semantically retrieved report facts into a unified context injected into every AI query.
   - Ensures AI answers have full situational awareness across conversations, meals, and reports.

3. **Medical Report Pipeline & RAG**:
   - Supports PDF and camera/photo uploads of lab records.
   - Extracts structured parameters: test names, numerical values, units, reference ranges, and abnormal/normal flags.
   - Chunks and vector-indexes observations using cosine similarity for patient Q&A (e.g. *"What did my last report say about LDL?"*).

4. **"This or That" Indian Food Preference Engine & 7-Day Diet Planner**:
   - Interactive taste profiling between Indian dishes (e.g., *Dal + Roti vs Paneer Rice*, *Idli Sambar vs Poha*).
   - Generates 7-day breakfast, lunch, snack, and dinner plans with regional preferences, calorie/macro breakdowns, and alternatives.
   - **Export to PDF** with one tap using native document rendering and system sharing.

5. **Meal Photo Scanner & Nutrition Tracker**:
   - Gemini Vision recognizes Indian home meals and calculates approximate calories, protein, carbohydrates, and fats.
   - Clearly flags estimates with *"Estimated"* badge to maintain medical honesty.

6. **Medical Safety & Non-Diagnostic Triage**:
   - Identifies red-flag medical emergencies (e.g. chest pain, breathing difficulty, stroke signs) and directs users immediately to Indian emergency numbers (`112`, `102`, `108`).
   - Categorizes symptoms into *Self-Care*, *Monitor*, *See Doctor Soon*, or *Urgent Emergency*.
   - Never claims clinical diagnosis; displays mandatory safety disclaimer across all AI interfaces.

7. **Nearby Healthcare (OpenStreetMap)**:
   - Queries OpenStreetMap Overpass API for nearby hospitals, clinics, and pharmacies.
   - Provides direct phone calling, emergency badge detection, and Google Maps turn-by-turn navigation.

8. **Family Health Network**:
   - Connect family members via unique Health IDs with explicit permission toggles for *Vitals*, *Reports*, *Medications*, and *Diet & Habits*.

---

## 🏗 Project Architecture

```
/Users/shikharyadav/Desktop/Mini Project
├── src/
│   ├── app/                         # Expo Router App Navigation
│   │   ├── _layout.tsx              # Root Stack & Safe Area
│   │   ├── index.tsx                # Dynamic splash/home route gate
│   │   ├── (auth)/                  # Login, Signup
│   │   ├── (onboarding)/            # Splash, Welcome, Health Data, Goals, This-or-That Preferences, Assistant Preview
│   │   ├── (tabs)/                  # Home, AI Chat, Track, Community, Profile
│   │   ├── report/                  # Upload and detailed report breakdown
│   │   ├── diet/                    # 7-day personalized meal plan & PDF export
│   │   ├── meal/                    # Meal photo scan & AI calorie analysis
│   │   └── care/                    # OpenStreetMap nearby care & symptom triage
│   ├── components/
│   │   ├── ui/                      # Button, Card, Input, HealthScore, ProgressBar, PersistentBottomSheet
│   │   ├── health/                  # WaterTrackerCard, VitalsCard, ReportTimelineCard
│   │   ├── nutrition/               # MealCard, ThisOrThatCard
│   │   ├── fitness/                 # WorkoutChecklist
│   │   └── ai/                      # AIMessageBubble, DisclaimerBadge
│   ├── services/
│   │   ├── api/                     # HTTP client, AIService, CareService
│   │   ├── demo/                    # Demo user Aarav (21) dataset
│   │   └── firebase/                # Firebase Auth, Firestore, Storage client
│   ├── store/                       # Zustand stores (useAuthStore, useHealthStore, useChatStore)
│   ├── constants/                   # theme.ts, i18n.ts (English & Hindi support)
│   └── types/                       # TypeScript models
├── backend/                         # Secure Node/Express Backend Layer
│   ├── src/
│   │   ├── index.ts                 # Express entry point (Port 5001)
│   │   ├── config/env.ts            # Validated environment configuration
│   │   ├── services/                # geminiService, ragService, contextAggregator, safetyLayer
│   │   ├── routes/                  # aiRoutes, reportRoutes, careRoutes
│   │   └── middlewares/             # authMiddleware, errorHandler
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── firestore.rules                  # Firestore security rules
├── storage.rules                    # Firebase Storage security rules
├── .env.example                     # Mobile client environment example
└── README.md
```

---

## ⚙️ Prerequisites

- **Node.js**: v18.0.0 or higher (v22.x recommended)
- **npm**: v9.0.0 or higher
- **Expo CLI**: bundled via `npx expo`
- **Optional Physical Device Testing**: [Expo Go](https://expo.dev/go) app on Android or iOS.

---

## 🚀 Quickstart Guide

### 1. Configure Environment Variables

**Mobile Client (`.env`)**:
Copy `.env.example` to `.env` in the root folder:
```bash
cp .env.example .env
```
*(Default settings connect to `http://localhost:5001` or Android emulator host `10.0.2.2`).*

**Backend Server (`backend/.env`)**:
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
To enable live Gemini multimodal inference:
1. Obtain an API key from [Google AI Studio](https://aistudio.google.com/).
2. Set `GEMINI_API_KEY=your_key_here` in `backend/.env`.
*(Note: If `GEMINI_API_KEY` is left blank, the backend automatically runs in **Zero-Config Intelligent Fallback Mode**, providing realistic clinical and nutritional outputs based on your active health context so you can test immediately!)*

---

### 2. Run the Backend Service

In a separate terminal, navigate to the `backend/` directory and start the server:
```bash
cd backend
npm install
npm run dev
```
The server will start on port `5001` with endpoints for `/api/ai/chat`, `/api/ai/analyze-meal`, `/api/reports/analyze`, and `/api/care/nearby`.

---

### 3. Run the Mobile Application

In the project root directory:
```bash
npm run start
```
From the interactive terminal:
- Press **`w`** to open in web browser.
- Press **`i`** to launch iOS simulator.
- Press **`a`** to launch Android emulator.
- Scan the QR code with **Expo Go** on your physical phone!

---

## 🛡 Security & Compliance Rules

- **Zero Client Secret Leaks**: The Gemini API key and Firebase Admin credentials reside strictly in the backend layer (`backend/.env`). No sensitive keys exist in the Expo client bundle.
- **Strict Firestore Rules**: User data is partitioned under `/users/{userId}/...`. Cross-user data access is blocked at the database rule layer.
- **Family Sharing Authorization**: Family access is enforced strictly through explicit boolean permissions (`vitals`, `reports`, `medications`, `plans`).
- **Medical Disclaimer**:
  > *"AI can make mistakes, so always double check important health information with a qualified healthcare professional."*

---

## 🧪 Verification & Demo User

- **Name**: Aarav
- **Age**: 21
- **Goal**: Fitness & Strength, Nutrition Optimization
- **Diet**: Vegetarian (Prefers *Dal + Roti*, *Paneer Rice*, *Poha*)
- **Health Score**: 82/100
- **Reports**: Complete Blood Count (CBC) & Lipid Panel
- **Demonstration Flow**:
  1. Complete Onboarding Screens 1–4.
  2. Experience the persistent AI bottom sheet on the Home screen.
  3. Quick-add hydration (`+250ml`, `+500ml`).
  4. Explore the 7-day personalized Indian meal plan and export to PDF.
  5. Upload or review laboratory reports with AI explanations and questions for your physician.
  6. Ask Medi Bud in AI Chat: *"Can I eat paneer tonight?"* or *"What did my last report say?"*.
