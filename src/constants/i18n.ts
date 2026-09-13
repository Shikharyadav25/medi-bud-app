export type SupportedLanguage =
  | 'English'
  | 'Hindi'
  | 'Bengali'
  | 'Marathi'
  | 'Tamil'
  | 'Telugu'
  | 'Kannada'
  | 'Gujarati'
  | 'Punjabi';

export const SUPPORTED_LANGUAGES: Array<{ code: SupportedLanguage; label: string; native: string }> = [
  { code: 'English', label: 'English', native: 'English' },
  { code: 'Hindi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'Bengali', label: 'Bengali', native: 'বাংলা' },
  { code: 'Marathi', label: 'Marathi', native: 'मराठी' },
  { code: 'Tamil', label: 'Tamil', native: 'தமிழ்' },
  { code: 'Telugu', label: 'Telugu', native: 'తెలుగు' },
  { code: 'Kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'Gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'Punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {
    tagline: 'Your Health, Understood',
    welcomeHeadline: 'Better health starts here',
    trackVitals: 'Track vitals',
    getInsights: 'Get insights',
    buildHabits: 'Build habits',
    valueSub: 'All in one app, powered by your AI Health Coach',
    startJourney: 'Start your journey',
    connectHealthData: 'Connect Health Data',
    fetchingData: 'Fetching data linked to',
    enterHealthId: 'Enter Health ID (e.g. 14-digit ABHA)',
    enterPhone: 'Enter phone number',
    enterName: 'Enter your name',
    securityNotice: 'Your data is 100% secure',
    securityDisclaimer:
      'We use your data only to provide personalized insights and apply strong security measures to protect it.',
    continue: 'Continue',
    skipForNow: 'Skip for now >',
    healthCircle: 'Health Circle',
    healthScore: 'Medi Bud Health Score',
    scoreSubtitle: 'Your score reflects your recent wellness habits and is not a medical assessment.',
    askAiPlaceholder: 'Ask your Health AI anything...',
    aiDisclaimer: 'AI can make mistakes, so always double check important health information with a qualified healthcare professional.',
    waterTracker: 'Water Tracker',
    hydrationGoal: 'Daily Hydration Goal',
    nutritionTracker: 'Nutrition Tracker',
    recentMeals: 'Recent Meals',
    dietPlan: '7-Day Diet Plan',
    workoutChecklist: 'Today’s Workout',
    medicalReports: 'Medical Timeline & Reports',
    uploadReport: 'Upload Report',
    nearbyCare: 'Nearby Healthcare',
    community: 'Wellness Communities',
    familySupport: 'Family Support',
  },
  Hindi: {
    tagline: 'आपका स्वास्थ्य, सरलता से समझें',
    welcomeHeadline: 'बेहतर स्वास्थ्य की शुरुआत यहाँ से',
    trackVitals: 'वाइटल्स ट्रैक करें',
    getInsights: 'एआई सलाह पाएं',
    buildHabits: 'अच्छी आदतें बनाएं',
    valueSub: 'सब कुछ एक ही ऐप में, आपके एआई हेल्थ कोच द्वारा संचालित',
    startJourney: 'शुरू करें',
    connectHealthData: 'स्वास्थ्य डेटा जोड़ें',
    fetchingData: 'डेटा लिंक किया जा रहा है',
    enterHealthId: 'हेल्थ आईडी दर्ज करें (ABHA)',
    enterPhone: 'फोन नंबर दर्ज करें',
    enterName: 'अपना नाम दर्ज करें',
    securityNotice: 'आपका डेटा 100% सुरक्षित है',
    securityDisclaimer: 'हम आपके डेटा का उपयोग केवल व्यक्तिगत स्वास्थ्य सलाह के लिए करते हैं।',
    continue: 'आगे बढ़ें',
    skipForNow: 'अभी छोड़ें >',
    healthCircle: 'हेल्थ सर्कल',
    healthScore: 'मेडी बड हेल्थ स्कोर',
    scoreSubtitle: 'यह स्कोर आपकी हाल की आदतों को दर्शाता है, यह चिकित्सीय निदान नहीं है।',
    askAiPlaceholder: 'हेल्थ एआई से कुछ भी पूछें...',
    aiDisclaimer: 'एआई से त्रुटि हो सकती है, महत्वपूर्ण स्वास्थ्य जानकारी के लिए हमेशा योग्य डॉक्टर से परामर्श लें।',
    waterTracker: 'पानी का ट्रैकर',
    hydrationGoal: 'दैनिक पानी का लक्ष्य',
    nutritionTracker: 'पोषण ट्रैकर',
    recentMeals: 'हाल के भोजन',
    dietPlan: '7-दिवसीय आहार योजना',
    workoutChecklist: 'आज का व्यायाम',
    medicalReports: 'मेडिकल रिपोर्ट्स और टाइमलाइन',
    uploadReport: 'रिपोर्ट अपलोड करें',
    nearbyCare: 'निकटतम स्वास्थ्य केंद्र',
    community: 'स्वास्थ्य समुदाय',
    familySupport: 'परिवार स्वास्थ्य सहायता',
  },
};

export function t(key: string, lang: SupportedLanguage = 'English'): string {
  const dict = TRANSLATIONS[lang] || TRANSLATIONS.English;
  return dict[key] || TRANSLATIONS.English[key] || key;
}
