export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: string[];
  action?: 'EMERGENCY' | 'SEE_DOCTOR_SOON' | 'MONITOR' | 'SELF_CARE';
  disclaimer?: string;
  attachedImageUri?: string;
  attachedReportId?: string;
  timestamp: string;
}

export interface DietPlanMeal {
  name: string;
  portion: string;
  approxCalories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
  alternatives: string[];
}

export interface SevenDayDietPlan {
  title: string;
  targetDailyCalories: number;
  macroTargets: { proteinG: number; carbsG: number; fatG: number };
  days: Array<{
    dayNumber: number;
    dayName: string;
    meals: {
      breakfast: DietPlanMeal;
      lunch: DietPlanMeal;
      eveningSnack: DietPlanMeal;
      dinner: DietPlanMeal;
    };
  }>;
  dietitianRationale: string;
  disclaimer: string;
}

export interface MealAnalysisResult {
  isFood?: boolean;
  error?: string;
  foodItems: Array<{ name: string; quantity: string; calories: number; proteinG: number; carbsG: number; fatG: number }>;
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  healthAssessment: string;
  isEstimated: boolean;
  suggestions: string[];
  disclaimer: string;
}

export interface SymptomTriageResult {
  triageLevel: 'EMERGENCY' | 'SEE_DOCTOR_SOON' | 'MONITOR' | 'SELF_CARE';
  isEmergency: boolean;
  emergencyType?: string;
  advisoryMessage: string;
  disclaimer: string;
}
