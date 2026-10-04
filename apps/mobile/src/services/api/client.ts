import { Platform } from 'react-native';

// In development on Android emulators, localhost is 10.0.2.2. On iOS simulator or web, it's localhost.
const defaultLocalhost = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || defaultLocalhost;

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
  fallbackData?: T
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API error ${response.status}: ${errorText}`);
    }

    return (await response.json()) as T;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn(`[API Client] Request to ${endpoint} failed or timed out.`, err);

    if (fallbackData !== undefined) {
      return fallbackData;
    }

    throw err;
  }
}
