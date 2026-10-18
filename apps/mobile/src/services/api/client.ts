import { Platform } from "react-native";
import { supabase } from "../supabase";

// In development on Android emulators, localhost is 10.0.2.2. On iOS simulator or web, it's localhost.
const defaultLocalhost =
  Platform.OS === "android" ? "http://10.0.2.2:8000" : "http://localhost:8000";

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultLocalhost;

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    const owner = session?.user.id;
    if (!token) throw new Error("Sign in to use this feature.");
    if (!__DEV__ && !API_BASE_URL.startsWith("https://"))
      throw new Error("A secure API connection is required.");
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        response.status === 401
          ? "Your session expired. Please sign in again."
          : response.status === 429
            ? "Too many requests. Try again shortly."
            : "The service could not complete the request. Try again.",
      );
    }

    const data = (await response.json()) as T;
    const current = await supabase.auth.getSession();
    if (current.data.session?.user.id !== owner)
      throw new Error("Account changed; the previous response was discarded.");
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}
