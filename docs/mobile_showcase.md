# Medi Bud Mobile — Showcase & Verification Guide

This is the reliable demonstration path for the Expo mobile app. It covers the real first-run flow, persistent tracking, grounded AI, meal-image validation, and medical-report validation.

## 1. Preflight

From the repository root:

```bash
pnpm install
pnpm build
python3 -m pytest tests/integration -q
pnpm build:mobile
```

Expected result: all API integration tests pass and mobile TypeScript reports no errors.

Create `services/api/.env` (the Gemini key must never be placed in mobile code):

```env
GEMINI_API_KEY=your_server_side_key
GEMINI_MODEL=gemini-3.8-flash
```

Start the backend:

```bash
cd services/api
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

In a second terminal, start mobile:

```bash
EXPO_PUBLIC_API_URL=http://localhost:8000 pnpm --filter @medi-bud/mobile web
```

For a physical phone, replace `localhost` with the computer's LAN IP, keep both devices on the same Wi-Fi, and allow port `8000` through the firewall.

Open these checks before presenting:

- `http://localhost:8000/health` — backend liveness.
- `http://localhost:8000/docs` — interactive FastAPI contract.
- Confirm the Gemini project has available quota. A valid key with exhausted quota returns `429`; the app will show an honest service error instead of inventing a scan.

## 2. Recommended 7-minute demo

### A. New-user journey

1. If an old session exists, open **Profile → Sign Out**.
2. Tap the splash screen, then **Start your journey**.
3. Choose **Sign Up** and use:
   - Name: `Mira Sharma`
   - Phone: `+91 98765 43010`
   - Password: `medibud123`
4. BMI profile:
   - Age: `29`
   - Height: `164 cm`
   - Weight: `61 kg`
   - Expected BMI: about `22.7`, shown as **Healthy range**.
5. Select goals such as **Nutrition Optimization** and **Better Sleep & Recovery**; choose **Vegetarian**.
6. Complete all four **This or That** food choices. Explain that selections persist in the user's food-preference profile and are sent as context to AI features.
7. Family circle:
   - Name: `Sunita Sharma`
   - Relationship: `Parent`
   - Age: `56`
   - Explain that reports and medications are private by default.
8. Accept or edit the suggested daily goals, for example `2,000 kcal` and `2,100 ml`, then open the dashboard.

### B. Dashboard and tracking

1. Show that the dashboard uses the user's name and calculates the health score from actual hydration, meal, activity, and report state.
2. Add `250 ml` water twice. Refresh the app to demonstrate persistence.
3. Open **Track**. The nutrition summary displays calories logged against the user's chosen target.
4. Complete a workout and choose a mood.

### C. Grounded AI assistant

Ask focused questions in this order:

1. `How much water should I drink based on today's log?`
2. `Give me a practical vegetarian dinner idea that fits my preferences.`
3. After uploading a report: `Explain the result in my latest report and tell me what to ask my doctor.`
4. Safety case: `I have crushing chest pain and cannot breathe.`

Expected behavior:

- The assistant uses profile, daily tracking, approved knowledge excerpts, and uploaded report facts as its context.
- Sources appear below grounded answers when relevant.
- Missing evidence produces an abstention instead of a fabricated fact.
- The safety case immediately directs the user to `112` or `108` and does not wait for Gemini.

### D. Meal scanner — positive and negative cases

Use a clear, well-lit image with one visible meal, such as a plate containing roti, dal, rice, and salad.

Expected positive result:

- Food names and portions are listed.
- Calories and protein/carbohydrate/fat estimates are clearly labeled AI-estimated.
- **Save to Today's Meals** updates Track and the calorie total.

Then upload a non-food image such as a keyboard, chair, selfie, pet, or landscape.

Expected negative result:

- The image is not logged.
- The app displays **No Food Detected** with a clear reason.

For an ambiguous or blurry image, rejection is the correct and safest outcome. If Gemini quota is exhausted, the app displays **Analysis Unavailable**; it never substitutes demo nutrition.

### E. Medical report validation — positive and negative cases

Positive input: use a synthetic/de-identified CBC or lipid report PDF with clearly visible labels, values, units, and reference ranges. Never use a real patient's identifiable report during a public demo.

Example synthetic values:

```text
Patient: Demo User
Hemoglobin 14.2 g/dL   Reference Range 13.0 - 17.0
Total Cholesterol 228 mg/dL   Reference < 200
LDL Cholesterol 148 mg/dL   Reference < 100
HDL Cholesterol 44 mg/dL   Reference > 40
```

Expected positive result:

- The backend validates the file signature and content before saving.
- Extracted tests are displayed on the report breakdown screen.
- The report becomes part of AI context.
- When Gemini is unavailable, supported text-based PDF lab values use the local extractive parser and are clearly labeled as locally extracted.

Negative inputs: a restaurant menu, food photo, invoice, blank PDF, selfie, or scenery image.

Expected negative result:

- The file is not saved as a medical report.
- The app displays **Not a Medical Report** or an explicit validator-unavailable message.

### F. Family and personalized plan

1. Open **Profile** and show the connected family member plus default permissions.
2. Tap **+ Add Member** to demonstrate the real input form and permission defaults.
3. Open **7-Day Diet**. Regenerate the plan after changing dietary category/allergies in a fresh profile, and point out the seven-day/4-meal contract.

### G. Live nearby care

1. Open **Nearby Healthcare** from the dashboard and allow location access when prompted.
2. Confirm the location card says **Using your current location**, shows the detected area, and displays GPS accuracy.
3. Switch the radius between **2 km**, **5 km**, and **10 km**.
4. Filter by **Hospitals**, **Clinics**, and **Pharmacies**. Results are live OpenStreetMap places sorted by distance; there are no sample facilities or default Delhi results.
5. Tap **Directions** on a result to open navigation to its exact coordinates. Tap **Call** when OpenStreetMap provides a phone number.
6. For the permission state demo, disable location access in device settings and reopen the screen. It should show **Location needed** and an **Open Location Settings** action rather than fabricated nearby places.

Nearby Care requires internet access from the backend to the public OpenStreetMap Overpass service. Public map providers may occasionally be busy; the app reports that condition and offers retry instead of substituting fake data.

## 3. Demo-account shortcut

On the login screen, **Explore Demo Account (Aarav, 21)** loads a populated local showcase profile. Use this only when time is short. The normal sign-up route is the better demonstration because it proves the complete onboarding and persistence flow.

## 4. What is real, and what is estimated

- Real: onboarding validation, BMI math, preference and family persistence, daily goals, local health-state persistence, deterministic safety escalation, API contracts, curated-corpus retrieval, report signature/content rejection, and allergen-aware meal-plan generation.
- Gemini-backed when quota is available: open-ended grounded answer phrasing, food recognition/macronutrient estimation, and broad medical-document classification/extraction.
- Local fallback: approved-corpus chat retrieval and supported lab extraction from text-based PDFs.
- Estimated: image-derived portions/calories/macros. The UI labels these values and does not present them as clinical measurements.

## 5. Fast troubleshooting

| Symptom | Fix |
| --- | --- |
| Phone cannot connect to API | Use `http://<computer-LAN-IP>:8000`, not `localhost`; restart Expo after changing the variable. |
| Gemini returns quota error | Enable billing/increase quota in the key's Google AI project or wait for quota reset. Do not put a second key in mobile code. |
| Report rejected | Use PDF/JPG/PNG under 10 MB with readable medical content. Text-based PDFs give the best local fallback. |
| Meal scan rejected | Use a sharp, well-lit food image with the meal occupying most of the frame. |
| Nearby Care asks for location | Allow foreground location access and make sure device Location Services/GPS are on. |
| Nearby Care reports live results unavailable | Confirm the backend has internet access, wait briefly, and tap **Retry Search**. |
| Old demo state appears | Profile → Sign Out, then create a new account. |
| Expo web seems stale | Stop Expo and restart with `pnpm --filter @medi-bud/mobile web --clear`. |
