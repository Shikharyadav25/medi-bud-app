export interface DailyVitals {
  bloodPressure: string;
  heartRate: number;
  bloodGlucose: string;
  spo2: number;
  weightKg: number;
  lastUpdated: string;
}

export interface WaterEntry {
  id: string;
  amountMl: number;
  timestamp: string;
  source: 'manual' | 'ai_image_verified';
}

export interface MealItem {
  id: string;
  name: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  imageUrl?: string;
  isEstimated: boolean;
  timestamp: string;
}

export interface WorkoutItem {
  id: string;
  title: string;
  category: 'Cardio' | 'Strength' | 'Yoga' | 'Walking';
  durationMinutes: number;
  completed: boolean;
  date: string;
}

export interface SleepEntry {
  id: string;
  date: string;
  durationHours: number;
  quality: 'Restful' | 'Average' | 'Restless';
}

export interface MoodEntry {
  id: string;
  date: string;
  rating: number; // 1 to 5
  notes?: string;
  tags?: string[];
}

export interface HealthScoreDetails {
  score: number;
  category: 'Optimal' | 'Good' | 'Needs Attention';
  breakdown: {
    hydration: number;
    nutrition: number;
    activity: number;
    sleep: number;
  };
  disclaimer: string;
}
