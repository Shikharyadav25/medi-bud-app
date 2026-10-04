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
  hasHydrated: boolean;
  setProfile: (profile: Partial<UserProfile>) => void;
  createAccount: (name: string, phone: string) => void;
  updateFoodPreferences: (prefs: Partial<FoodPreferences>) => void;
  addFamilyMember: (member: FamilyMember) => void;
  setLanguage: (lang: SupportedLanguage) => void;
  completeOnboarding: () => void;
  authenticate: () => void;
  resetToDemoUser: () => void;
  logout: () => void;
  loadStoredProfile: () => Promise<void>;
}

const STORAGE_KEY = '@medibud_profile';
const SESSION_KEY = '@medibud_session';

const EMPTY_PROFILE: UserProfile = {
  id: '',
  name: '',
  phone: '',
  age: 0,
  gender: 'Other',
  heightCm: 0,
  weightKg: 0,
  bmi: 0,
  healthGoals: [],
  dietaryPreferences: [],
  allergies: [],
  medicalConditions: [],
  medications: [],
  foodPreferences: { preferred: [], disliked: [], spiciness: 'medium', regionalCuisine: [] },
  language: 'English',
  familyMembers: [],
  isSeniorMode: false,
  onboardingCompleted: false,
  createdAt: new Date().toISOString(),
};

export const useAuthStore = create<AuthState>((set, get) => ({
  profile: EMPTY_PROFILE,
  isAuthenticated: false,
  isOnboardingCompleted: false,
  isLoading: true,
  hasHydrated: false,

  setProfile: (updates) => {
    const updated = { ...get().profile, ...updates };
    set({ profile: updated });
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch((e) => console.warn('Storage error:', e));
  },

  createAccount: (name, phone) => {
    const profile = { ...EMPTY_PROFILE, id: `user-${Date.now()}`, name, phone, createdAt: new Date().toISOString() };
    set({ profile, isAuthenticated: true, isOnboardingCompleted: false });
    AsyncStorage.multiSet([[STORAGE_KEY, JSON.stringify(profile)], [SESSION_KEY, 'active']]).catch(() => undefined);
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

  authenticate: () => {
    set({ isAuthenticated: true });
    AsyncStorage.setItem(SESSION_KEY, 'active').catch(() => undefined);
  },

  resetToDemoUser: () => {
    set({ profile: DEMO_USER_PROFILE, isAuthenticated: true, isOnboardingCompleted: true });
    AsyncStorage.multiSet([[STORAGE_KEY, JSON.stringify(DEMO_USER_PROFILE)], [SESSION_KEY, 'active']]).catch((e) => console.warn('Storage error:', e));
  },

  logout: () => {
    set({ isAuthenticated: false });
    AsyncStorage.removeItem(SESSION_KEY).catch((e) => console.warn('Storage error:', e));
  },

  loadStoredProfile: async () => {
    try {
      const [stored, session] = await Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(SESSION_KEY)]);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProfile;
        set({
          profile: parsed,
          isAuthenticated: session === 'active',
          isOnboardingCompleted: parsed.onboardingCompleted ?? true,
          isLoading: false,
          hasHydrated: true,
        });
      } else {
        set({ isLoading: false, hasHydrated: true });
      }
    } catch {
      set({ isLoading: false, hasHydrated: true });
    }
  },
}));
