import { create } from 'zustand';
import { DailyVitals, HealthScoreDetails, MealItem, WorkoutItem } from '../types/health';
import { MedicalReport } from '../types/report';
import { SevenDayDietPlan } from '../types/ai';
import {
  DEMO_DIET_PLAN,
  DEMO_HEALTH_SCORE,
  DEMO_RECENT_MEALS,
  DEMO_SAMPLE_REPORT,
  DEMO_VITALS,
  DEMO_WORKOUTS,
} from '../services/demo/demoData';

interface HealthState {
  vitals: DailyVitals;
  waterIntakeMl: number;
  waterGoalMl: number;
  waterStreakDays: number;
  recentMeals: MealItem[];
  workouts: WorkoutItem[];
  reports: MedicalReport[];
  dietPlan: SevenDayDietPlan;
  healthScore: HealthScoreDetails;
  addWater: (amountMl: number) => void;
  resetWater: () => void;
  addMeal: (meal: MealItem) => void;
  toggleWorkout: (id: string) => void;
  addReport: (report: MedicalReport) => void;
  updateVitals: (updates: Partial<DailyVitals>) => void;
  setDietPlan: (plan: SevenDayDietPlan) => void;
}

export const useHealthStore = create<HealthState>((set, get) => ({
  vitals: DEMO_VITALS,
  waterIntakeMl: 1750,
  waterGoalMl: 2500,
  waterStreakDays: 5,
  recentMeals: DEMO_RECENT_MEALS,
  workouts: DEMO_WORKOUTS,
  reports: [DEMO_SAMPLE_REPORT],
  dietPlan: DEMO_DIET_PLAN,
  healthScore: DEMO_HEALTH_SCORE,

  addWater: (amountMl) => {
    const current = get().waterIntakeMl;
    const newTotal = Math.max(0, current + amountMl);
    set({ waterIntakeMl: newTotal });
  },

  resetWater: () => {
    set({ waterIntakeMl: 0 });
  },

  addMeal: (meal) => {
    set({ recentMeals: [meal, ...get().recentMeals] });
  },

  toggleWorkout: (id) => {
    const updated = get().workouts.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w));
    set({ workouts: updated });
  },

  addReport: (report) => {
    set({ reports: [report, ...get().reports] });
  },

  updateVitals: (updates) => {
    set({ vitals: { ...get().vitals, ...updates, lastUpdated: 'Just now' } });
  },

  setDietPlan: (plan) => {
    set({ dietPlan: plan });
  },
}));
