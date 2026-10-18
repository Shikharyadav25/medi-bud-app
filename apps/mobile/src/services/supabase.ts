import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { privateStorage } from "./privateStorage";

export const isSupabaseConfigured = Boolean(
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
);
const storage = {
  getItem: async (key: string) =>
    Platform.OS === "web"
      ? typeof window === "undefined"
        ? null
        : window.localStorage.getItem(key)
      : privateStorage.getItem(key),
  setItem: async (key: string, value: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined")
        window.localStorage.setItem(key, value);
    } else await privateStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") window.localStorage.removeItem(key);
    } else await privateStorage.removeItem(key);
  },
};
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || "https://unconfigured.supabase.co",
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "unconfigured",
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export async function mobileAccessToken() {
  if (!isSupabaseConfigured) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token || null;
}
