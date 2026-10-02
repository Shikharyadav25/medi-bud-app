// Versioned clinical red-flag questionnaire and escalation rules
// Verified against official Indian public health emergency numbers (MHA ERSS / MoHFW)

export const SAFETY_VERSION = '2026.10.1';

export interface EmergencyContact {
  label: string;
  number: string;
  description: string;
  source: string;
}

export const EMERGENCY_CONTACTS: EmergencyContact[] = [
  {
    label: 'National Emergency Helpline',
    number: '112',
    description: 'All-in-one emergency service across India (Police, Fire, Ambulance)',
    source: 'Ministry of Home Affairs, Govt. of India (Emergency Response Support System)',
  },
  {
    label: 'Medical Ambulance Service',
    number: '108',
    description: 'Emergency medical and disaster ambulance services',
    source: 'National Health Mission, MoHFW, Govt. of India',
  },
  {
    label: 'Basic Patient Transport Ambulance',
    number: '102',
    description: 'Free transport for mothers and infants / basic healthcare transport',
    source: 'National Health Mission, MoHFW, Govt. of India',
  },
  {
    label: 'National Poison Information Centre (AIIMS)',
    number: '1800-116-117',
    description: 'Toll-free emergency toxicology guidance (AIIMS New Delhi)',
    source: 'Department of Pharmacology, All India Institute of Medical Sciences (AIIMS)',
  },
];

export type UrgencyLevel = 'emergency' | 'soon' | 'monitor' | 'self_care';

export interface QuestionnaireQuestion {
  id: string;
  prompt: string;
  category: 'red_flag' | 'urgent' | 'subacute';
  severity: UrgencyLevel;
  explanation: string;
}

export const RED_FLAG_QUESTIONS: QuestionnaireQuestion[] = [
  {
    id: 'rf_chest_pain',
    prompt: 'Are you experiencing acute crushing chest pain, pressure, or tightness radiating to your jaw or arm?',
    category: 'red_flag',
    severity: 'emergency',
    explanation: 'Could indicate acute coronary syndrome or myocardial infarction.',
  },
  {
    id: 'rf_breathlessness',
    prompt: 'Are you having sudden severe difficulty breathing or gasping for air at rest?',
    category: 'red_flag',
    severity: 'emergency',
    explanation: 'Potential sign of severe respiratory distress, pulmonary embolism, or anaphylaxis.',
  },
  {
    id: 'rf_neuro_stroke',
    prompt: 'Do you notice sudden face drooping, weakness in one arm, or difficulty speaking clearly (FAST signs)?',
    category: 'red_flag',
    severity: 'emergency',
    explanation: 'Key indicators of acute cerebrovascular accident (stroke).',
  },
  {
    id: 'rf_fever_stiff_neck',
    prompt: 'Do you have a sudden high fever accompanied by a stiff neck, confusion, or extreme sensitivity to light?',
    category: 'red_flag',
    severity: 'emergency',
    explanation: 'Classic symptoms of suspected meningitis or CNS infection.',
  },
  {
    id: 'rf_severe_anaphylaxis',
    prompt: 'Do you have swelling of your lips, tongue, or throat, or hives after food/medication exposure?',
    category: 'red_flag',
    severity: 'emergency',
    explanation: 'Severe systemic allergic reaction requiring immediate epinephrine / emergency resuscitation.',
  },
  {
    id: 'urg_persistent_vomiting',
    prompt: 'Have you had severe vomiting or diarrhea for more than 24 hours without keeping fluids down?',
    category: 'urgent',
    severity: 'soon',
    explanation: 'Risk of acute dehydration and electrolyte imbalances.',
  },
  {
    id: 'urg_high_fever_duration',
    prompt: 'Has your fever remained above 102°F (38.9°C) for more than 3 consecutive days?',
    category: 'urgent',
    severity: 'soon',
    explanation: 'Persistent fever warrants clinical laboratory evaluation for tropical or bacterial infections.',
  },
];

export interface SymptomEvaluationResult {
  level: UrgencyLevel;
  headline: string;
  guidanceText: string;
  recommendedAction: string;
  matchedQuestions: QuestionnaireQuestion[];
  emergencyContacts: EmergencyContact[];
}

export function evaluateSymptomAnswers(
  positiveQuestionIds: string[]
): SymptomEvaluationResult {
  const matched = RED_FLAG_QUESTIONS.filter((q) => positiveQuestionIds.includes(q.id));
  const hasEmergency = matched.some((q) => q.severity === 'emergency');
  const hasSoon = matched.some((q) => q.severity === 'soon');

  if (hasEmergency) {
    return {
      level: 'emergency',
      headline: 'Immediate Emergency Care Needed',
      guidanceText:
        'One or more critical red-flag symptoms were identified. This requires immediate evaluation at an emergency department or hospital.',
      recommendedAction: 'Call 112 or 108 immediately or have someone take you to the nearest emergency room.',
      matchedQuestions: matched,
      emergencyContacts: EMERGENCY_CONTACTS,
    };
  }

  if (hasSoon) {
    return {
      level: 'soon',
      headline: 'Consult a Doctor Within 24–48 Hours',
      guidanceText:
        'Your answers indicate persistent or moderate-severity symptoms that require a clinical evaluation by a medical doctor.',
      recommendedAction: 'Schedule an appointment at a nearby clinic or outpatient department today.',
      matchedQuestions: matched,
      emergencyContacts: EMERGENCY_CONTACTS.slice(0, 2),
    };
  }

  return {
    level: 'self_care',
    headline: 'Supportive Care & Monitoring',
    guidanceText:
      'No critical red flags were triggered. Maintain rest, adequate hydration, and monitor how you feel.',
    recommendedAction:
      'If your symptoms worsen, do not improve over 48 hours, or new red-flag symptoms appear, re-check or visit a healthcare provider.',
    matchedQuestions: [],
    emergencyContacts: EMERGENCY_CONTACTS.slice(0, 1),
  };
}
