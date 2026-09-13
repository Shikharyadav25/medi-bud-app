import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserProfile, FamilyMember, FoodPreferences } from '../types/user';
import { SupportedLanguage } from '../constants/i18n';
import { DEMO_USER_PROFILE } from '../services/demo/demoData';

interface AuthState {
  profile: UserProfile;
  isAuthenticated: boolean;
  isOnboardingCompleted: boolean;
  isLoading: boolean;
  setProfile: (profile: Partial<UserProfile>) => void;
  updateFoodPreferences: (prefs: Partial<FoodPreferences>) => void;
  addFamilyMember: (member: FamilyMember) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  completeOnboarding: () => void;
  resetToDemoUser: () => void;
  logout: () => void;
  loadStoredProfile: () => Promise<void>;
}

const STORAGE_KEY = '@medibud_profile';

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: DEMO_USER_PROFILE,
  isAuthenticated: true,
  isOnboardingCompleted: true,
  isLoading: false,

  setProfile: (updates) => {
    const updated = { ...get().profile, ...updates };
    set({ profile: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) => console.warn('Storage error:', e));
  },

  updateFoodPreferences: (prefs) => {
    const current = get().profile;
    const updated = {
      ...current,
      foodPreferences: {
        ...current.foodPreferences,
        ...prefs,
      },
    };
    set({ profile: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) => console.warn('Storage error:', e));
  },

  addFamilyMember: (member) => {
    const current = get().profile;
    const updated = {
      ...current,
      familyMembers: [...current.familyMembers, member],
    };
    set({ profile: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) => console.warn('Storage error:', e));
  },

  setLanguage: (lang) => {
    const updated = { ...get().profile, language: lang };
    set({ profile: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) => console.warn('Storage error:', e));
  },

  completeOnboarding: () => {
    const updated = { ...get().profile, onboardingCompleted: true };
    set({ profile: updated, isOnboardingCompleted: true });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) => console.warn('Storage error:', e));
  },

  resetToDemoUser: () => {
    set({ profile: DEMO_USER_PROFILE, isAuthenticated: true, isOnboardingCompleted: true });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_USER_PROFILE)).catch((e) => console.warn('Storage error:', e));
  },

  logout: () => {
    const reset = { ...DEMO_USER_PROFILE, onboardingCompleted: false };
    set({ profile: reset, isAuthenticated: false, isOnboardingCompleted: false });
    AsyncStorage.removeItem(STORAGE_KEY).catch((e) => console.warn('Storage error:', e));
  },

  loadStoredProfile: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        set({
          profile: parsed,
          isAuthenticated: true,
          isOnboardingCompleted: parsed.onboardingCompleted ?? true,
        });
      }
    } catch {
      // Keep default demo user
    }
  },
}));
