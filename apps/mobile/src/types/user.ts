import { SupportedLanguage } from '../constants/i18n';

export interface FamilyMember {
  id: string;
  name: string;
  relation: 'Parent' | 'Spouse' | 'Child' | 'Sibling' | 'Other';
  age: number;
  phone?: string;
  uniqueFamilyId: string;
  permissions: {
    profile: boolean;
    reports: boolean;
    medications: boolean;
    vitals: boolean;
    plans: boolean;
  };
}

export interface FoodPreferences {
  preferred: string[];
  disliked: string[];
  spiciness: 'mild' | 'medium' | 'spicy';
  regionalCuisine: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  healthId?: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  heightCm: number;
  weightKg: number;
  bmi: number;
  healthGoals: string[];
  dietaryPreferences: string[];
  allergies: string[];
  medicalConditions: string[];
  medications: Array<{ id: string; name: string; dosage: string; frequency: string; time: string }>;
  foodPreferences: FoodPreferences;
  language: SupportedLanguage;
  familyMembers: FamilyMember[];
  isSeniorMode: boolean;
  onboardingCompleted: boolean;
  createdAt: string;
}
