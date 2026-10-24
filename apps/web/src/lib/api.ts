import { MediBudClient } from "@medi-bud/api-client";
import { getCurrentAccessToken } from "@/lib/supabase";
import { publicConfig } from "./publicConfig";

export const apiBaseUrl = publicConfig.apiBaseUrl;

export const apiClient = new MediBudClient({
  baseUrl: apiBaseUrl,
  getToken: getCurrentAccessToken,
  timeoutMs: 15000,
});
