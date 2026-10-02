import { MediBudClient } from '@medi-bud/api-client';
import { getCurrentAccessToken } from '@/lib/supabase';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export const apiClient = new MediBudClient({
  baseUrl: apiBaseUrl,
  getToken: getCurrentAccessToken,
  timeoutMs: 15000,
});
