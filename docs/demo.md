# Presentation outline

Use the current [demonstration guide](demo_guide.md) for installation, the synthetic PDF and the exact walkthrough. Do not use old screenshots or fictional fallback fixtures as live results.

| Time     | Show                                                     | Explain                                                                              |
| -------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 0–1 min  | Homepage, explicit local demo, demo dashboard           | A health journal and educational companion, not a diagnostic service                 |
| 1–2 min  | Water/sleep logging and a reminder                       | Real persistence; reminder journal does not imply a scheduled notification           |
| 2–3 min  | Upload synthetic PDF, inspect and confirm values         | Human review precedes use as confirmed report evidence                               |
| 3–4 min  | Report question, inspect citation                        | Extractive answers with uncertainty; no “zero hallucination” claim                   |
| 4–5 min  | Generate filtered meal ideas and download PDF            | Estimated nutrition, no therapeutic diet or allergy safety guarantee                 |
| 5–6 min  | Symptom escalation, honest nearby-care empty state       | No symptom-clearance claim, no fake facilities, no test emergency calls              |
| Optional | Account export/deletion, actual integration-test results | Owner-scoped API storage; production auth, native and clinical gates remain separate |

Do not quote historical ML metrics as a current evaluation. Do not claim all Supabase policies, mobile permissions or provider APIs are verified unless the current environment's recorded checks establish that. The local demonstration uses a fresh encrypted SQLite database, not a live hosted Supabase database.
