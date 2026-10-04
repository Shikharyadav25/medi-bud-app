import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  calorieGoal: number;
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
  setDailyGoals: (calories: number, waterMl: number) => void;
  resetForNewUser: () => void;
  resetToDemoUser: () => void;
  loadStoredHealth: () => Promise<void>;
}

const HEALTH_STORAGE_KEY = '@medibud_health';
const saveHealth = (state: HealthState) => AsyncStorage.setItem(HEALTH_STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);

export const useHealthStore = create<HealthState>((set, get) => ({
  vitals: DEMO_VITALS,
  waterIntakeMl: 1750,
  waterGoalMl: 2500,
  calorieGoal: 2200,
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
    saveHealth(get());
  },

  resetWater: () => {
    set({ waterIntakeMl: 0 });
    saveHealth(get());
  },

  addMeal: (meal) => {
    set({ recentMeals: [meal, ...get().recentMeals] });
    saveHealth(get());
  },

  toggleWorkout: (id) => {
    const updated = get().workouts.map((w) => (w.id === id ? { ...w, completed: !w.completed } : w));
    set({ workouts: updated });
    saveHealth(get());
  },

  addReport: (report) => {
    set({ reports: [report, ...get().reports] });
    saveHealth(get());
  },

  updateVitals: (updates) => {
    set({ vitals: { ...get().vitals, ...updates, lastUpdated: 'Just now' } });
    saveHealth(get());
  },

  setDietPlan: (plan) => {
    set({ dietPlan: plan });
    saveHealth(get());
  },

  setDailyGoals: (calories, waterMl) => {
    set({ calorieGoal: calories, waterGoalMl: waterMl });
    saveHealth(get());
  },

  resetForNewUser: () => {
    set({
      vitals: { ...DEMO_VITALS, bloodPressure: '—', heartRate: 0, bloodGlucose: '—', spo2: 0, lastUpdated: 'Not added yet' },
      waterIntakeMl: 0,
      waterGoalMl: 2500,
      calorieGoal: 2000,
      waterStreakDays: 0,
      recentMeals: [],
      workouts: DEMO_WORKOUTS.map((workout) => ({ ...workout, completed: false })),
      reports: [],
      dietPlan: DEMO_DIET_PLAN,
      healthScore: { ...DEMO_HEALTH_SCORE, score: 0, category: 'Needs Attention' },
    });
    saveHealth(get());
  },

  resetToDemoUser: () => {
    set({
      vitals: DEMO_VITALS, waterIntakeMl: 1750, waterGoalMl: 2500, calorieGoal: 2200,
      waterStreakDays: 5, recentMeals: DEMO_RECENT_MEALS, workouts: DEMO_WORKOUTS,
      reports: [DEMO_SAMPLE_REPORT], dietPlan: DEMO_DIET_PLAN, healthScore: DEMO_HEALTH_SCORE,
    });
    saveHealth(get());
  },

  loadStoredHealth: async () => {
    try {
      const stored = await AsyncStorage.getItem(HEALTH_STORAGE_KEY);
      if (stored) set(JSON.parse(stored));
    } catch {
      // Keep safe in-memory defaults when storage is unavailable.
    }
  },
}));
