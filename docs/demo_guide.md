# Medi Bud AI Health Companion — Complete Execution & Feature Demonstration Guide

This guide provides step-by-step instructions to boot the complete Medi Bud monorepo (FastAPI backend, Next.js web application, and React Native mobile application) and walk a new user through every key feature.

---

## 1. System Requirements & Initial Setup

Ensure you have the following installed:
- **Node.js**: v20.x or v22.x LTS
- **pnpm**: v9.x or v10.x (`npm install -g pnpm`)
- **Python**: 3.11, 3.12, or 3.13

### Step 0: Install Dependencies & Compile Shared Packages
From the repository root directory (`medi-bud-app`):
```bash
# 1. Install all monorepo dependencies
pnpm install

# 2. Build the shared TypeScript packages
pnpm build
```

---

## 2. Launching the Application (3 Terminals)

Open three separate terminal windows or tabs at the repository root:

### Terminal 1: Run the Python FastAPI Backend
```bash
cd services/api
python3 -m uvicorn main:app --port 8000 --reload
```
- **Verification**: Open `http://127.0.0.1:8000/health` in your browser. It should return:
  ```json
  {"status": "healthy", "service": "Medi Bud AI Health Companion API", "environment": "development"}
  ```

### Terminal 2: Run the Next.js 15 Web Application
```bash
# From the repository root
pnpm --filter @medi-bud/web dev
```
- **Verification**: Open `http://localhost:3000` in your browser. The landing page will load.

### Terminal 3: Run the React Native Expo Mobile App
```bash
# Option A: Run in your browser via Expo Web
pnpm --filter @medi-bud/mobile web

# Option B: Run on physical device / simulator via Expo Go
pnpm --filter @medi-bud/mobile start
```
- **Web Verification**: Open `http://localhost:8081` in your browser.
- **Physical Device**: Scan the terminal QR code using **Expo Go** (Android) or the **Camera app** (iOS).

---

## 3. Web Application: Feature-by-Feature Demonstration Tour

Follow this sequential walkthrough to present the web application to a new user:

### Feature 1: Authentication & 1-Click Demonstration Access
1. Navigate to `http://localhost:3000/login`.
2. **What to show**:
   - Standard email/password authentication backed by Supabase Auth with Row-Level Security (RLS).
   - Click the green **"Launch Demonstration Account"** button.
   - Explain: This creates an immediate demo session with valid tokens, allowing instant evaluation without manual sign-up.
3. The app redirects to the **Dashboard** (`/dashboard`).

### Feature 2: Transparent Habit Tracking & Offline Outbox
1. Navigate to `http://localhost:3000/dashboard`.
2. **What to show**:
   - **Habits Completed Card**: Shows `X of 4 Habits Completed Today`. Explain that Medi Bud never penalizes users for chronic illnesses or prescribed medications; the score reflects only positive wellness behaviors.
   - **Hydration Logger**: Click the **`+ 250ml`** or **`+ 500ml`** button. The water progress bar dynamically increases.
   - **User-Entered Reminders**: Click on reminder items to toggle their completed state.
   - **Offline Outbox Demo**:
     - Open Chrome DevTools (`F12`), go to the **Network** tab, and toggle **Offline**.
     - Notice the Navbar changes to an orange **"Offline"** badge with a pending mutation count.
     - Log water or check a reminder while offline; changes are queued locally in `Dexie.js` (IndexedDB).
     - Set the network back to **Online** and click **"Sync Now"**; mutations automatically replay to the server without duplicate entries.

### Feature 3: Lab Report Extraction & Human-in-the-Loop Review
1. Navigate to `http://localhost:3000/reports`.
2. **What to show**:
   - **Uploaded Documents**: Select the pre-loaded report `Lipid_Panel_Sept2026.pdf`.
   - **Human-in-the-Loop Safeguard Table**:
     - Point out the extracted biomarkers: Total Cholesterol (`228 mg/dL`), LDL Cholesterol (`148 mg/dL`), and HDL Cholesterol (`44 mg/dL`).
     - Explain: All extracted values initially default to `Proposed`. Medi Bud **never** feeds unverified values into the AI model until the user explicitly confirms them.
     - Click **"Confirm Observations"**; the button displays `Saved ✓`.
   - **Upload Zone**: Highlight that the drag-and-drop zone inspects magic file signatures (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`), enforcing a 10MB size limit and a 20-page document cap.

### Feature 4: Cited Health Q&A (Zero Hallucination)
1. Navigate to `http://localhost:3000/chat`.
2. **What to show**:
   - Click the preset button: *"What does my elevated LDL cholesterol mean for cardiovascular wellness?"*
   - Point out the generated answer:
     - It references the exact confirmed numbers from the lipid panel (`148 mg/dL`).
     - Point out the interactive **Citation Cards** below the answer displaying Document Title, Date, Page Number, and the verbatim Quoted Excerpt.
   - Clinical boundary: Medi Bud abstains from medical diagnoses or prescribing treatments, focusing purely on educational comprehension and lifestyle habits.

### Feature 5: Deterministic 7-Day Indian Wellness Meal Planner
1. Navigate to `http://localhost:3000/plan`.
2. **What to show**:
   - Explain that nutritional metrics are calibrated against the **ICMR-NIN Indian Food Composition Tables (IFCT)**.
   - Click through **Day 1 to Day 7** tabs to view meal schedules (Breakfast, Lunch, Evening Snack, Dinner) with calories, protein, carbs, and fat breakdowns.
   - **Allergen & Diet Filters**: Select allergens (e.g. `peanuts`, `dairy`) and click **"Generate Custom Plan"**. The plan automatically recalculates, excluding those ingredients.
   - **PDF Export**: Click **"Download Plan PDF"**. A printable meal plan PDF generated by the backend's ReportLab engine downloads immediately.

### Feature 6: Red-Flag Symptom Guidance & Emergency Triage
1. Navigate to `http://localhost:3000/symptoms`.
2. **What to show**:
   - Shows deterministic safety questions for acute clinical warning signs.
   - Check the box for **"Acute, crushing chest pain or pressure"** or **"Sudden face drooping or slurred speech"**.
   - Notice the card immediately escalates to a high-contrast **Emergency Warning** state.
   - Point out the direct hotline dialers for verified Indian emergency services: **112** (National Emergency), **108** (Ambulance), and **102** (Pregnancy & Infant).

### Feature 7: Nearby Healthcare Discovery
1. Navigate to `http://localhost:3000/nearby`.
2. **What to show**:
   - Displays hospitals, clinics, and pharmacies within a 5 km radius, powered by the OpenStreetMap Overpass API (no proprietary map API key required).
   - Test category filter buttons: **All**, **Hospitals**, **Clinics**, **Pharmacies**.
   - Each card provides operating hours, emergency indicators, and a **"Directions"** link opening Google Maps turn-by-turn navigation.

---

## 4. Mobile Application: Feature-by-Feature Demonstration Tour

Open `http://localhost:8081` (or your mobile device with Expo Go):

### Screen 1: Today Dashboard (`/`)
1. View the main dashboard personalized for the user (*"Namaste, Aarav"*).
2. Point out the **Medi Bud Health Score (82/100)** with category bars for Hydration, Diet, and Habits.
3. Show the four quick-action cards:
   - **Scan Meal**: Quick food logging.
   - **7-Day Diet**: Navigates to Indian wellness meal planning.
   - **Upload Lab**: Direct document, camera, and gallery report picker.
   - **Local Care**: Discovery for nearby medical facilities.

### Screen 2: Track & Hydration Screen (`/track`)
1. Tap the **Track** tab on the bottom bar.
2. Tap **`+250ml`** or **`+500ml`**; observe the circular hydration progress indicator updating toward the 2.5L daily target.
3. Scroll down to review logged meals with timestamps and calorie/protein/carb breakdowns.

### Screen 3: 7-Day Indian Diet Plan (`/diet/plan`)
1. Tap **7-Day Diet** from the Home screen or tap into meal recommendations.
2. Switch across day tabs (Day 1 through Day 7).
3. Review regional Indian meal items (Poha, Roti with Dal, Khichdi, Idli Sambar) calibrated against IFCT reference data.

### Screen 4: Health AI Assistant (`/ai`)
1. Tap the bottom **AI Assistant** bar or floating trigger.
2. Tap any prompt chip (e.g. *"Analyze symptoms"*, *"Review my health"*, or *"Interpret lab reports"*).
3. Review the conversational guidance with built-in medical disclaimers.

### Screen 5: Profile & Senior-Friendly Accessibility Mode (`/profile`)
1. Tap the **Profile** tab on the bottom bar.
2. Shows Health ID, physical metrics (Age, Height, Weight, BMI), and Family Health Network sync.
3. Toggle the **"Senior-Friendly Readable UI Mode"** switch:
   - **Highlight**: The font size, element padding, and color contrast ratios instantly increase across the entire app for elderly users.

---

## 5. Troubleshooting & Frequently Asked Questions

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| **`401 Unauthorized` on web requests** | Stale demo token or expired JWT | Click **"Launch Demonstration Account"** on [`/login`](file:///Users/shikharyadav/Desktop/Projects/Medi%20Bud/medi-bud-app/apps/web/src/app/login/page.tsx) to refresh the local token. |
| **Unstyled web page / 404 on CSS chunks** | Dev server was running while `next build` executed | Stop the Next.js terminal, run `rm -rf apps/web/.next`, and restart with `pnpm --filter @medi-bud/web dev`. |
| **Mobile app cannot reach backend on phone** | Physical phone cannot resolve `localhost` | Set `EXPO_PUBLIC_API_URL=http://<YOUR_COMPUTER_LAN_IP>:8000` in `.env` and restart Expo. |
| **Port 8000 or 3000 already in use** | Stale process listening on port | Check processes with `lsof -iTCP:8000,3000 -sTCP:LISTEN` and terminate with `kill <PID>`. |
