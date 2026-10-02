import json
import os

# Generates 288 high-quality labeled non-clinical intent utterances (48 per intent)
# 12 distinct paraphrase groups per intent * 4 utterances per group = 72 groups total.
# Partitioned 8 train (66.7%), 2 val (16.7%), 2 test (16.7%) per intent.

data = []

# 1. report_question
rq_groups = [
    ("rq_hemoglobin", [
        "What was my hemoglobin level in my latest blood test?",
        "Can you check my hemoglobin from the recent report?",
        "How much is my hemoglobin according to my CBC?",
        "Tell me my latest hemoglobin count in my report.",
    ]),
    ("rq_cholesterol", [
        "Is my total cholesterol within the normal reference range?",
        "Did my lipid panel show high cholesterol?",
        "What is the reported reference interval for my cholesterol in the report?",
        "Check if my cholesterol is elevated in my last test result.",
    ]),
    ("rq_platelets", [
        "What was my platelet count on my CBC report?",
        "How many platelets were reported in my blood work?",
        "Is my platelet count above 150000 on my lab sheet?",
        "Check my platelet result from my CBC document.",
    ]),
    ("rq_blood_sugar", [
        "What was my fasting glucose in the report?",
        "How high was my fasting blood sugar on my latest test?",
        "Did my report show high fasting glucose?",
        "What was the observed value for blood glucose fasting in my report?",
    ]),
    ("rq_ldl", [
        "What is my LDL bad cholesterol value in my lab report?",
        "Check my LDL cholesterol reading from the lab report.",
        "Was my LDL reported outside the desirable range on my blood test?",
        "How much LDL cholesterol was observed in my test result?",
    ]),
    ("rq_hba1c", [
        "What was my HbA1c percentage in the report?",
        "Show me my glycated hemoglobin level from the report.",
        "What did the lab report say about my HbA1c result?",
        "Is my HbA1c listed in my uploaded documents?",
    ]),
    ("rq_wbc", [
        "What was my total WBC count on the test?",
        "How many white blood cells were recorded in my CBC report?",
        "Check if my leukocyte count is normal in the lab results.",
        "What is my total white blood cell count in the blood report?",
    ]),
    ("rq_triglycerides", [
        "What were my triglycerides in the lipid profile report?",
        "How high are my triglyceride levels according to the test?",
        "Did my lab report show normal triglycerides?",
        "Tell me the triglyceride reading from my uploaded test.",
    ]),
    ("rq_pcv", [
        "What was my packed cell volume or PCV in the CBC?",
        "Check my hematocrit PCV reading from the lab test.",
        "What did my blood report say for PCV percentage?",
        "Is my PCV value within the stated interval in my report?",
    ]),
    ("rq_hdl", [
        "What was my HDL good cholesterol level on the lipid test?",
        "Did my lipid panel report HDL above 40?",
        "Check my HDL reading from my recent report.",
        "Is my HDL cholesterol in the healthy range in my lab results?",
    ]),
    ("rq_report_date", [
        "What was the collection date on my uploaded blood report?",
        "When was my latest CBC report taken?",
        "What date is printed on my lipid profile test?",
        "Check the report date of my most recent document.",
    ]),
    ("rq_lab_name", [
        "Which diagnostic laboratory processed my uploaded report?",
        "What lab name is shown on my blood test document?",
        "Who was the service provider on my recent pathology test?",
        "What laboratory generated my CBC report?",
    ]),
]

# 2. nutrition_question
nq_groups = [
    ("nq_protein_veg", [
        "What are good vegetarian sources of protein in Indian food?",
        "How can I get more protein as a vegetarian in India?",
        "Which Indian vegetarian foods have the highest protein content?",
        "Suggest high protein veg foods like dal, sprouts, or paneer.",
    ]),
    ("nq_iron_diet", [
        "What foods can help increase dietary iron intake?",
        "Which Indian ingredients are rich in dietary iron?",
        "Can eating palak or methi boost dietary iron?",
        "What everyday foods contain good nutritional iron?",
    ]),
    ("nq_poha_calories", [
        "How many calories are in a bowl of poha?",
        "What is the nutritional value of poha with peanuts?",
        "Is poha a nutritious breakfast option?",
        "Tell me the approximate macros for a plate of poha.",
    ]),
    ("nq_paneer_macros", [
        "How much protein and fat is in 100g of paneer?",
        "What are the nutritional facts for cottage cheese or paneer?",
        "What are the approximate macros for palak paneer?",
        "How many calories and grams of protein are in paneer?",
    ]),
    ("nq_fiber_intake", [
        "Which Indian foods provide the most dietary fiber?",
        "How can I increase fiber in my daily meals?",
        "Are whole wheat rotis and millets high in dietary fiber?",
        "Tell me high fiber vegetarian food options in India.",
    ]),
    ("nq_egg_nutrition", [
        "How much protein is in two boiled eggs?",
        "What are the calories and fat content in egg bhurji?",
        "What is the nutrient breakdown of boiled eggs?",
        "How many grams of protein do whole eggs provide?",
    ]),
    ("nq_cholesterol_diet", [
        "What dietary foods help support healthy cholesterol levels?",
        "Should I reduce fried foods and trans fats for better cholesterol?",
        "Can oats, apples, and soluble fiber help cholesterol nutrition?",
        "What dietary adjustments help manage lipid intake?",
    ]),
    ("nq_curd_benefits", [
        "What are the nutritional benefits of dahi or curd?",
        "How much protein is in a cup of plain low-fat curd?",
        "What nutrients does traditional buttermilk or chaas supply?",
        "Is plain curd high in protein and calcium?",
    ]),
    ("nq_makhana_snack", [
        "What is the calorie and carb content of roasted makhana?",
        "Is fox nut or makhana a healthy low calorie snack?",
        "Tell me the nutritional facts of roasted phool makhana.",
        "How much fiber and protein is in a bowl of makhana?",
    ]),
    ("nq_khichdi_nutrition", [
        "How many calories are in a bowl of moong dal khichdi?",
        "Is moong dal khichdi an easily digestible balanced meal?",
        "What is the macronutrient breakdown of dal khichdi with ghee?",
        "Tell me the carbs and protein in khichdi.",
    ]),
    ("nq_chana_sprouts", [
        "How much protein is in boiled kala chana or black chickpeas?",
        "What are the nutritional benefits of sprouted green moong salad?",
        "Are sprouted pulses higher in micronutrients and fiber?",
        "Tell me the protein and fiber content of sprouted moong.",
    ]),
    ("nq_millet_benefits", [
        "What is the nutritional difference between jowar, bajra, and wheat?",
        "Are millet rotis like bajra or jowar higher in dietary fiber?",
        "What are the nutritional benefits of including millets in meals?",
        "How many calories and fiber are in one jowar bhakri?",
    ]),
]

# 3. plan_request
pr_groups = [
    ("pr_7day_veg", [
        "Generate a 7-day vegetarian Indian meal plan for me.",
        "Create a weekly vegetarian diet plan with breakfast, lunch, and dinner.",
        "I need a 7-day Indian veg meal plan.",
        "Can you build a one-week vegetarian meal plan?",
    ]),
    ("pr_allergy_dairy", [
        "Build a meal plan excluding dairy because I am lactose intolerant.",
        "Create a weekly diet plan with no milk, paneer, or curd.",
        "I need an Indian meal plan with zero dairy products.",
        "Generate a dairy-free meal plan for the week.",
    ]),
    ("pr_nonveg_plan", [
        "Make a weekly meal plan including chicken and fish options.",
        "Generate a 7-day non-vegetarian Indian diet plan.",
        "Create a meal plan with eggs and chicken for lunch and dinner.",
        "Can you give me a weekly meal plan with non-veg dishes?",
    ]),
    ("pr_high_protein_plan", [
        "Generate a high-protein 7-day meal plan for active habits.",
        "Create a balanced weekly plan focused on protein foods.",
        "I want a 7-day Indian meal plan with maximum protein.",
        "Build a meal schedule emphasizing lentils, eggs, and paneer.",
    ]),
    ("pr_south_indian", [
        "Create a weekly meal plan with South Indian recipes like idli and sambar.",
        "Can you generate a 7-day South Indian style meal plan?",
        "I want my 7-day plan to focus on South Indian foods.",
        "Build a weekly plan featuring dosa, idli, and rasam.",
    ]),
    ("pr_gluten_free", [
        "Build a 7-day meal plan without wheat or gluten.",
        "Generate a gluten-free Indian diet plan using rice and millets.",
        "Create a weekly plan avoiding roti, maida, and suji.",
        "I need a 7-day Indian meal plan with no gluten.",
    ]),
    ("pr_export_pdf", [
        "How do I export my 7-day meal plan to a PDF document?",
        "Can I download a PDF copy of my current meal plan?",
        "Where is the button to download my diet plan as PDF?",
        "Export my saved meal plan into a PDF file format.",
    ]),
    ("pr_modify_plan", [
        "How can I regenerate or update my 7-day meal plan?",
        "I want to change my dietary preference and re-create my plan.",
        "Can I reset my weekly meal plan with new allergen filters?",
        "Regenerate my 7-day meal plan with updated choices.",
    ]),
    ("pr_quick_breakfast_plan", [
        "Can you generate a meal plan focused on quick morning breakfasts?",
        "Create a 7-day meal plan with fast healthy breakfast options.",
        "Build a weekly diet plan with convenient Indian breakfasts.",
        "Generate a 7-day meal plan featuring poha, upma, and chilla.",
    ]),
    ("pr_nut_free_plan", [
        "Create a 7-day meal plan without peanuts or tree nuts.",
        "Generate a weekly diet plan excluding peanut and nut allergens.",
        "I need an Indian meal plan safe for peanut allergies.",
        "Build a 7-day meal plan with zero nuts.",
    ]),
    ("pr_simple_home_plan", [
        "Build a simple homestyle 7-day Indian meal plan with dal and roti.",
        "Generate an easy homestyle weekly diet plan using basic pantry items.",
        "Create a realistic 7-day Indian meal plan with dal, sabzi, and rice.",
        "Make a week-long meal plan with everyday Indian dishes.",
    ]),
    ("pr_save_plan", [
        "How do I save my generated 7-day meal plan to my profile?",
        "Can I save this weekly meal plan for later access?",
        "Where is the save button for my newly created meal plan?",
        "Save this 7-day diet plan so I can see it on mobile.",
    ]),
]

# 4. tracker_help
th_groups = [
    ("th_water_log", [
        "How do I log my daily water intake in the tracker?",
        "Where do I record how much water I drank today in the app?",
        "Can I add 500ml of water to my daily tracking record?",
        "How does water tracking work in the Medi Bud tracker?",
    ]),
    ("th_sleep_log", [
        "How do I record my sleep hours for last night in the log?",
        "Where can I enter that I slept for 7.5 hours in the tracker?",
        "How to log sleep duration in the habit tracker?",
        "Can I update my sleep hours log for today?",
    ]),
    ("th_activity_log", [
        "How do I log a 30-minute brisk walk in the tracker?",
        "Where do I track my daily exercise minutes in the app log?",
        "How to record physical activity duration in the tracker?",
        "Can I log running or workout activity minutes today?",
    ]),
    ("th_reminders", [
        "How do I add a new reminder for drinking water or walking?",
        "Where can I create a daily medication or habit reminder in the app?",
        "How do I set a reminder schedule at 8:00 AM?",
        "Can I schedule user-entered reminder alerts in the app?",
    ]),
    ("th_offline_sync", [
        "Can I log habits when I don't have internet connection?",
        "Will my water and sleep logs save in the offline outbox?",
        "How does offline log synchronization work when reconnecting?",
        "What happens to my habit tracker logs if my device is offline?",
    ]),
    ("th_habit_score", [
        "How is the daily habit completion count calculated on the dashboard?",
        "Why does my habit counter display 2 of 4 tasks completed today?",
        "Does having health conditions decrease my habit count?",
        "What logging actions count towards completing daily habits?",
    ]),
    ("th_complete_reminder", [
        "How do I mark a reminder as completed in the due list?",
        "Where do I click to check off a reminder that is due today?",
        "Can I mark my scheduled reminder done from the dashboard?",
        "How to check off my morning reminder completion?",
    ]),
    ("th_view_history", [
        "Where can I see my past logs from earlier this week in the tracker?",
        "How do I view my historical water and sleep records in the app?",
        "Can I inspect my tracker history from yesterday?",
        "Show me where past activity and habit logs are listed.",
    ]),
    ("th_delete_reminder", [
        "How do I delete or remove an existing reminder schedule?",
        "Where is the delete icon for an unwanted reminder?",
        "Can I remove a reminder schedule that I no longer need?",
        "How to clear an old reminder from my schedule list?",
    ]),
    ("th_sync_button", [
        "Where is the manual Sync Now button for offline items?",
        "How do I trigger an immediate sync of my pending outbox logs?",
        "Can I manually press sync to upload my offline habit entries?",
        "How to force sync my offline water and sleep logs?",
    ]),
    ("th_log_meal", [
        "How do I manually log a food portion in my meal tracker?",
        "Where do I log that I ate 2 rotis and a bowl of dal?",
        "Can I record my lunch meal intake in the app tracker?",
        "How to log manual meals with portion sizes?",
    ]),
    ("th_edit_goal", [
        "Can I customize my daily water target from 2000ml to 2500ml?",
        "How do I adjust my daily water intake target in the tracker?",
        "Where do I change my daily sleep or hydration goals?",
        "How to modify habit tracking targets in my settings?",
    ]),
]

# 5. app_help
ah_groups = [
    ("ah_upload_report", [
        "How do I upload a new lab report into Medi Bud?",
        "Where is the upload button for PDF or image medical reports?",
        "What file formats can I upload for my blood test in the app?",
        "How do I scan or pick a report file from my phone in the app?",
    ]),
    ("ah_review_observations", [
        "How do I confirm or edit extracted values from my uploaded report?",
        "Why does my report status indicate review needed in the app?",
        "Where do I approve the test results extracted by OCR?",
        "Can I edit an observation value if the parser misread it?",
    ]),
    ("ah_delete_account", [
        "How can I delete my Medi Bud account and all data?",
        "Where is the settings option to delete my profile and reports?",
        "Can I completely erase my uploaded documents and user history?",
        "How to perform account deletion in profile settings?",
    ]),
    ("ah_language_hindi", [
        "How do I switch the application language to Hindi in settings?",
        "Can I view the user interface in Hindi (हिंदी) in Medi Bud?",
        "Where is the language selector toggle for English and Hindi?",
        "How to change app interface language to Hindi in my profile?",
    ]),
    ("ah_privacy_security", [
        "Are my medical documents private and isolated in the database?",
        "Can another user access or view my uploaded blood test records?",
        "How does row level security protect my personal report data?",
        "Is user data strictly isolated by database authentication?",
    ]),
    ("ah_nearby_care", [
        "How do I find nearby hospitals or clinics in the care tab?",
        "Where does the nearby care feature get its clinic listings?",
        "Can I search for healthcare facilities without giving GPS permission?",
        "How to open directions to a nearby hospital on map apps?",
    ]),
    ("ah_disclaimer_scope", [
        "Does Medi Bud provide certified clinical medical diagnoses?",
        "Is Medi Bud an official replacement for consulting my doctor?",
        "What is the medical disclaimer for this college companion prototype?",
        "Can this software prescribe medications for health conditions?",
    ]),
    ("ah_supported_tests", [
        "Which types of lab reports does the Medi Bud parser support?",
        "Can the app parse CBC, blood glucose, and lipid panels?",
        "Does the prototype extract reports other than demonstrated pathology tests?",
        "What lab tests can the extractor recognize right now?",
    ]),
    ("ah_download_report", [
        "How do I download the original PDF file of my uploaded report?",
        "Where is the download link to view my uploaded lab document?",
        "Can I retrieve my original uploaded PDF from the report screen?",
        "How to download my stored lab report file?",
    ]),
    ("ah_symptom_guide", [
        "How does the symptom guidance questionnaire work in the app?",
        "Where do I find the emergency red-flag symptom questionnaire?",
        "Is the symptom guidance tool a diagnostic decision system?",
        "How to use the symptom guide feature in Medi Bud?",
    ]),
    ("ah_login_signup", [
        "How do I sign in or create an account with email and password?",
        "Where do I enter my email to sign up for Medi Bud?",
        "How does Supabase authentication work in Medi Bud?",
        "Can I reset my password if I forget my login credentials?",
    ]),
    ("ah_offline_mode", [
        "What features work while Medi Bud is in offline mode?",
        "Can I browse my cached profile and saved meal plan offline?",
        "Why does AI chat state that it requires an active internet connection?",
        "Which app screens are accessible without an internet connection?",
    ]),
]

# 6. general_health
gh_groups = [
    ("gh_sleep_hygiene", [
        "What are recommended tips for healthy sleep hygiene?",
        "How many hours of sleep should a healthy adult get on average?",
        "How can someone improve their sleep quality naturally at night?",
        "What bedtime habits promote restorative sleep for adults?",
    ]),
    ("gh_hydration_science", [
        "Why is staying adequately hydrated important for human physiology?",
        "How does drinking sufficient fluids support kidney waste clearance?",
        "What are general wellness guidelines for daily water intake?",
        "What physiological roles does water play in human health?",
    ]),
    ("gh_walking_exercise", [
        "How many minutes of brisk walking are recommended per week by WHO?",
        "Is 150 minutes of moderate aerobic exercise beneficial for heart health?",
        "What are the general health benefits of regular moderate exercise?",
        "How does daily physical activity benefit cardiovascular wellness?",
    ]),
    ("gh_lab_reference", [
        "What does a biological reference interval mean on clinical lab tests?",
        "Why do reference ranges differ between different diagnostic laboratories?",
        "Does an observed value outside reference range automatically indicate disease?",
        "How should one generally understand reference intervals on medical tests?",
    ]),
    ("gh_stress_reduction", [
        "What are evidence-informed techniques to manage everyday mental stress?",
        "How does regular aerobic activity help reduce everyday stress?",
        "Can deep breathing and regular sleep lower stress hormone levels?",
        "What everyday habits support mental well-being and stress relief?",
    ]),
    ("gh_balanced_plate", [
        "What constitutes a balanced daily meal according to ICMR guidelines?",
        "How should an everyday Indian plate be proportioned for general wellness?",
        "Why is dietary diversity important across whole grains, pulses, and vegetables?",
        "What are the core components of a healthy balanced diet?",
    ]),
    ("gh_sedentary_habits", [
        "What are the health risks of prolonged sedentary sitting throughout the day?",
        "How often should an office worker stand up and move during long desk hours?",
        "Why is breaking up prolonged sitting beneficial for metabolic health?",
        "What simple strategies can reduce sedentary behavior during desk work?",
    ]),
    ("gh_heart_wellness", [
        "What everyday lifestyle habits help maintain long-term cardiovascular health?",
        "How do aerobic exercise and soluble fiber support heart health?",
        "Why is avoiding trans-fats and tobacco important for vascular wellness?",
        "What lifestyle habits promote general cardiovascular vitality?",
    ]),
    ("gh_salt_intake", [
        "What are WHO guidelines regarding daily dietary sodium and salt intake?",
        "Why is moderating excess sodium intake recommended for blood pressure?",
        "How much table salt should an adult consume per day at maximum?",
        "What are the health benefits of moderating dietary salt?",
    ]),
    ("gh_sunlight_vitd", [
        "How does safe sunlight exposure support natural Vitamin D synthesis?",
        "What role does Vitamin D play in bone density and immune wellness?",
        "Why is morning sunlight exposure beneficial for circadian rhythm?",
        "What are general wellness recommendations for Vitamin D and sunlight?",
    ]),
    ("gh_posture_ergonomics", [
        "What are good ergonomic tips for maintaining healthy spinal posture?",
        "How can someone avoid neck and back strain while working on computers?",
        "What simple stretches relieve neck stiffness from prolonged screen time?",
        "How does ergonomic desk setup benefit long-term musculoskeletal health?",
    ]),
    ("gh_screen_time_eyes", [
        "What is the 20-20-20 rule for reducing digital eye fatigue?",
        "How can someone protect their eyes during extended digital screen time?",
        "Why does blue light exposure before bed affect melatonin and sleep?",
        "What habits help reduce digital eye strain during computer work?",
    ]),
]

all_intents = [
    ("report_question", rq_groups),
    ("nutrition_question", nq_groups),
    ("plan_request", pr_groups),
    ("tracker_help", th_groups),
    ("app_help", ah_groups),
    ("general_health", gh_groups),
]

example_id = 1
for intent_label, group_list in all_intents:
    for group_id, utterances in group_list:
        for text in utterances:
            data.append({
                "id": f"utt_{example_id:04d}",
                "text": text,
                "intent": intent_label,
                "paraphrase_group_id": group_id,
                "is_synthetic": True,
                "provenance": "Reviewed synthetic utterances for non-clinical intent routing"
            })
            example_id += 1

out_path = "/Users/shikharyadav/Desktop/Projects/Medi Bud/medi-bud-app/ml/data/intent_dataset.json"
os.makedirs(os.path.dirname(out_path), exist_ok=True)
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Generated {len(data)} labeled utterances across {len(all_intents)} intents ({len(all_intents) * 12} groups).")
