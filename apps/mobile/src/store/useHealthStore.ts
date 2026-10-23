import { create } from "zustand";
import { privateStorage } from "../services/privateStorage";
import { supabase } from "../services/supabase";
import { apiClient } from "../services/api/client";
import {
  DailyVitals,
  HealthScoreDetails,
  MealItem,
  WorkoutItem,
} from "../types/health";
import { MedicalReport } from "../types/report";
import { SevenDayDietPlan } from "../types/ai";
const EMPTY_VITALS: DailyVitals = {
  bloodPressure: "—",
  heartRate: 0,
  bloodGlucose: "—",
  spo2: 0,
  weightKg: 0,
  lastUpdated: "Not added yet",
};
const EMPTY_PLAN: SevenDayDietPlan = {
  title: "No meal ideas yet",
  targetDailyCalories: 0,
  macroTargets: { proteinG: 0, carbsG: 0, fatG: 0 },
  days: [],
  dietitianRationale: "No plan generated.",
  disclaimer: "Meal ideas are estimates, not a prescribed diet.",
};
const EMPTY_SCORE: HealthScoreDetails = {
  score: 0,
  category: "Not assessed",
  breakdown: { hydration: 0, nutrition: 0, activity: 0, sleep: 0 },
  disclaimer: "Journal activity is not a clinical assessment.",
};

interface HealthState {
  journalDate: string;
  refreshJournalDay: () => void;
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
  loadStoredHealth: () => Promise<void>;
}

let saveQueue = Promise.resolve();
let healthLoadVersion = 0;
let healthOwnerId: string | null = null;
export const flushHealthWrites = () => saveQueue;
const saveHealth = (state: HealthState) => {
  const owner = healthOwnerId;
  if (!owner) return;
  const snapshot = JSON.stringify({
    ...state,
    savedDate: state.journalDate,
  });
  const sessionAtWrite = supabase.auth.getSession();
  saveQueue = saveQueue
    .then(async () => {
      const {
        data: { session },
      } = await sessionAtWrite;
      if (session?.user.id === owner && healthOwnerId === owner)
        await privateStorage.setItem("medibud.health." + owner, snapshot);
    })
    .catch(() => undefined);
};

export const useHealthStore = create<HealthState>((set, get) => ({
  journalDate: new Date().toLocaleDateString("en-CA"),
  refreshJournalDay: () => {
    const today = new Date().toLocaleDateString("en-CA");
    if (get().journalDate === today) return;
    set({
      journalDate: today,
      waterIntakeMl: 0,
      recentMeals: [],
      workouts: get().workouts.map((workout) => ({
        ...workout,
        completed: false,
      })),
      healthScore: { ...EMPTY_SCORE },
    });
    saveHealth(get());
  },
  vitals: { ...EMPTY_VITALS },
  waterIntakeMl: 0,
  waterGoalMl: 2500,
  calorieGoal: 2200,
  waterStreakDays: 0,
  recentMeals: [],
  workouts: [],
  reports: [],
  dietPlan: { ...EMPTY_PLAN },
  healthScore: { ...EMPTY_SCORE },

  addWater: (amountMl) => {
    get().refreshJournalDay();
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
    get().refreshJournalDay();
    set({
      recentMeals: [
        { ...meal, timestamp: new Date().toISOString() },
        ...get().recentMeals,
      ],
    });
    saveHealth(get());
  },

  toggleWorkout: (id) => {
    get().refreshJournalDay();
    const updated = get().workouts.map((w) =>
      w.id === id ? { ...w, completed: !w.completed } : w,
    );
    set({ workouts: updated });
    saveHealth(get());
  },

  addReport: (report) => {
    set({ reports: [report, ...get().reports] });
    saveHealth(get());
  },

  updateVitals: (updates) => {
    set({ vitals: { ...get().vitals, ...updates, lastUpdated: "Just now" } });
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
    healthLoadVersion += 1;
    healthOwnerId = null;
    set({
      journalDate: new Date().toLocaleDateString("en-CA"),
      vitals: { ...EMPTY_VITALS },
      waterIntakeMl: 0,
      waterGoalMl: 2500,
      calorieGoal: 2000,
      waterStreakDays: 0,
      recentMeals: [],
      workouts: [],
      reports: [],
      dietPlan: { ...EMPTY_PLAN },
      healthScore: { ...EMPTY_SCORE },
    });
  },

  loadStoredHealth: async () => {
    const loadVersion = ++healthLoadVersion;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const stored = session
        ? await privateStorage.getItem("medibud.health." + session.user.id)
        : null;
      const current = await supabase.auth.getSession();
      if (
        loadVersion !== healthLoadVersion ||
        !session ||
        current.data.session?.user.id !== session.user.id
      )
        return;
      healthOwnerId = session.user.id;
      if (stored) {
        const parsed = JSON.parse(stored);
        const sameDay =
          parsed.savedDate === new Date().toLocaleDateString("en-CA");
        set({
          ...parsed,
          journalDate: new Date().toLocaleDateString("en-CA"),
          waterIntakeMl: sameDay ? parsed.waterIntakeMl : 0,
          recentMeals: sameDay ? parsed.recentMeals : [],
          workouts: sameDay
            ? parsed.workouts || []
            : (parsed.workouts || []).map((workout: WorkoutItem) => ({
                ...workout,
                completed: false,
              })),
          healthScore: sameDay
            ? parsed.healthScore || { ...EMPTY_SCORE }
            : { ...EMPTY_SCORE },
        });
      }
      if (session) {
        try {
          const reports = await apiClient<MedicalReport[]>("/api/reports");
          const active = await supabase.auth.getSession();
          if (
            loadVersion !== healthLoadVersion ||
            active.data.session?.user.id !== session.user.id
          )
            return;
          set({ reports });
        } catch {
          /* Preserve this account's encrypted cache when offline. */
        }
      }
    } catch {
      // Keep safe in-memory defaults when storage is unavailable.
    }
  },
}));
