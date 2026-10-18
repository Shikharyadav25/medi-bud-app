import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserProfile, FamilyMember, FoodPreferences } from "../types/user";
import { SupportedLanguage } from "../constants/i18n";
import { supabase, isSupabaseConfigured } from "../services/supabase";
import { privateStorage } from "../services/privateStorage";
import { useHealthStore, flushHealthWrites } from "./useHealthStore";
import { useChatStore } from "./useChatStore";

interface AuthState {
  profile: UserProfile;
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  setProfile: (profile: Partial<UserProfile>) => void;
  createAccount: (
    name: string,
    email: string,
    password: string,
  ) => Promise<boolean>;
  updateFoodPreferences: (prefs: Partial<FoodPreferences>) => void;
  addFamilyMember: (member: FamilyMember) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  completeOnboarding: () => void;
  authenticate: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadStoredProfile: () => Promise<void>;
}
const EMPTY_PROFILE: UserProfile = {
  id: "",
  name: "",
  phone: "",
  age: 0,
  gender: "Other",
  heightCm: 0,
  weightKg: 0,
  bmi: 0,
  healthGoals: [],
  dietaryPreferences: [],
  allergies: [],
  medicalConditions: [],
  medications: [],
  foodPreferences: {
    preferred: [],
    disliked: [],
    spiciness: "medium",
    regionalCuisine: [],
  },
  language: "English",
  familyMembers: [],
  isSeniorMode: false,
  onboardingCompleted: false,
  createdAt: new Date().toISOString(),
};

const profileKey = (id: string) => "medibud.profile." + id;
export const useAuthStore = create<AuthState>((set, get) => ({
  profile: EMPTY_PROFILE,
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isLoading: true,
  hasHydrated: false,
  setProfile: (updates) => {
    const current = get().profile;
    const updated = { ...current, ...updates, id: current.id };
    set({ profile: updated });
    if (updated.id)
      void privateStorage
        .setItem(profileKey(updated.id), JSON.stringify(updated))
        .catch(() => undefined);
  },
  createAccount: async (name, email, password) => {
    if (!isSupabaseConfigured)
      throw new Error(
        "Sign-in is not configured. Contact the app administrator.",
      );
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    if (!data.session) return false;
    await get().loadStoredProfile();
    return true;
  },
  authenticate: async (email, password) => {
    if (!isSupabaseConfigured)
      throw new Error(
        "Sign-in is not configured. Contact the app administrator.",
      );
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    await get().loadStoredProfile();
  },
  updateFoodPreferences: (prefs) =>
    get().setProfile({
      foodPreferences: { ...get().profile.foodPreferences, ...prefs },
    }),
  addFamilyMember: (member) =>
    get().setProfile({
      familyMembers: [...get().profile.familyMembers, member],
    }),
  setLanguage: (language) => get().setProfile({ language }),
  completeOnboarding: () => {
    get().setProfile({ onboardingCompleted: true });
    set({ isOnboardingCompleted: true });
  },
  logout: async () => {
    const id = get().profile.id;
    set({ isAuthenticated: false });
    await flushHealthWrites();
    await supabase.auth.signOut({ scope: "local" });
    useChatStore.getState().clearMessages();
    if (id) {
      await privateStorage.removeItem(profileKey(id));
      await privateStorage.removeItem("medibud.health." + id);
      await privateStorage.removeItem("medibud.outbox." + id);
    }
    useHealthStore.getState().resetForNewUser();
    set({
      profile: EMPTY_PROFILE,
      isAuthenticated: false,
      isOnboardingCompleted: false,
    });
  },
  loadStoredProfile: async () => {
    try {
      // Discard the old unauthenticated, shared device profile.
      await AsyncStorage.multiRemove([
        "@medibud_profile",
        "@medibud_session",
        "@medibud_health",
      ]);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        set({ profile: EMPTY_PROFILE, isAuthenticated: false });
        return;
      }
      if (get().profile.id !== session.user.id) {
        useHealthStore.getState().resetForNewUser();
        useChatStore.getState().clearMessages();
      }
      const saved = await privateStorage.getItem(profileKey(session.user.id));
      const profile = saved
        ? (JSON.parse(saved) as UserProfile)
        : {
            ...EMPTY_PROFILE,
            id: session.user.id,
            name: session.user.user_metadata.name || "",
          };
      set({
        profile: { ...profile, id: session.user.id },
        isAuthenticated: true,
        isOnboardingCompleted: profile.onboardingCompleted,
      });
      await useHealthStore.getState().loadStoredHealth();
    } finally {
      set({ isLoading: false, hasHydrated: true });
    }
  },
}));
