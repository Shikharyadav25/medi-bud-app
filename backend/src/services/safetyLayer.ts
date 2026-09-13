export interface SafetyCheckResult {
  isEmergency: boolean;
  emergencyType?: string;
  recommendedAction: 'EMERGENCY' | 'SEE_DOCTOR_SOON' | 'MONITOR' | 'SELF_CARE';
  disclaimer: string;
  advisoryMessage?: string;
}

export const MANDATORY_MEDICAL_DISCLAIMER =
  'AI can make mistakes, so always double check important health information with a qualified healthcare professional.';

const EMERGENCY_RED_FLAGS = [
  { pattern: /\b(chest pain|crushing pain|pressure in chest|heart attack|angina)\b/i, label: 'Possible Cardiac Emergency' },
  { pattern: /\b(difficulty breathing|shortness of breath|cannot breathe|gasping|suffocating)\b/i, label: 'Respiratory Distress' },
  { pattern: /\b(stroke|facial drooping|arm weakness|slurred speech|sudden numbness)\b/i, label: 'Possible Stroke' },
  { pattern: /\b(suicide|end my life|kill myself|self-harm|hurting myself)\b/i, label: 'Crisis / Self-Harm' },
  { pattern: /\b(unconscious|fainted|loss of consciousness|seizure|convulsion)\b/i, label: 'Neurological Emergency' },
  { pattern: /\b(severe bleeding|coughing blood|vomiting blood|heavy hemorrhage)\b/i, label: 'Severe Hemorrhage' },
  { pattern: /\b(severe allergic reaction|anaphylaxis|swollen throat|swollen tongue)\b/i, label: 'Anaphylaxis' },
];

export function evaluateMedicalSafety(text: string): SafetyCheckResult {
  const normalized = text.toLowerCase();

  for (const flag of EMERGENCY_RED_FLAGS) {
    if (flag.pattern.test(normalized)) {
      if (flag.label === 'Crisis / Self-Harm') {
        return {
          isEmergency: true,
          emergencyType: flag.label,
          recommendedAction: 'EMERGENCY',
          disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
          advisoryMessage:
            'If you or someone you know is in distress or having thoughts of self-harm, please reach out immediately: India Helpline: 112 or Tele-MANAS at 14416 (24x7 toll-free). Professional help is available right now.',
        };
      }

      return {
        isEmergency: true,
        emergencyType: flag.label,
        recommendedAction: 'EMERGENCY',
        disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
        advisoryMessage: `URGENT: Your symptoms may indicate an emergency (${flag.label}). Please call emergency services (112 / 102 / 108 in India) or proceed immediately to the nearest emergency medical facility. Do not delay emergency care.`,
      };
    }
  }

  // Triage patterns for "See Doctor Soon"
  const seeDoctorPatterns = [
    /\b(fever for|fever lasting|high fever|fever >|102|103|104)\b/i,
    /\b(persistent cough|blood in urine|unexplained weight loss|lump|swelling)\b/i,
    /\b(severe pain|unbearable pain|sharp abdominal pain|appendix)\b/i,
  ];

  for (const pattern of seeDoctorPatterns) {
    if (pattern.test(normalized)) {
      return {
        isEmergency: false,
        recommendedAction: 'SEE_DOCTOR_SOON',
        disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
        advisoryMessage:
          'These symptoms warrant timely professional medical evaluation. Please schedule a consultation with a registered medical practitioner soon.',
      };
    }
  }

  return {
    isEmergency: false,
    recommendedAction: 'SELF_CARE',
    disclaimer: MANDATORY_MEDICAL_DISCLAIMER,
  };
}
