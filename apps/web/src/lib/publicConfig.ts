/** Validate only public deployment settings. Privileged keys must never enter the browser. */
export function resolvePublicConfig(input: {
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  production?: boolean;
}) {
  function origin(value: string | undefined) {
    if (!value) return "";
    try {
      const url = new URL(value);
      const local =
        !input.production &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
      if (
        (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash ||
        url.pathname !== "/"
      )
        return "";
      if (
        input.production &&
        ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
      )
        return "";
      return url.origin;
    } catch {
      return "";
    }
  }
  const supabaseUrl = origin(input.supabaseUrl);
  const key = (input.supabaseKey || "").trim();
  let publicKey = /^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key);
  if (!publicKey && key.split(".").length === 3) {
    try {
      const payload = key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
      publicKey = JSON.parse(atob(payload)).role === "anon";
    } catch {
      publicKey = false;
    }
  }
  const authConfigured = Boolean(supabaseUrl && publicKey);
  const apiOrigin = origin(input.apiUrl);
  if (key && !publicKey)
    throw new Error(
      "Use only a Supabase publishable key or legacy anon key in the public frontend settings. Privileged or malformed keys are prohibited.",
    );
  if (input.supabaseUrl && !supabaseUrl)
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTPS origin (HTTP localhost is development-only).",
    );
  if (input.apiUrl && !apiOrigin)
    throw new Error(
      "NEXT_PUBLIC_API_URL must be a valid HTTPS origin (HTTP localhost is development-only).",
    );
  return {
    authConfigured,
    supabaseUrl: authConfigured ? supabaseUrl : "https://demo.supabase.co",
    supabaseKey: authConfigured ? key : "demo_anon_key",
    apiConfigured: Boolean(apiOrigin),
    apiBaseUrl:
      apiOrigin || (input.production ? "/api" : "http://127.0.0.1:8000"),
  };
}

// Validate both public key variables, even if the preferred one is present.
for (const candidate of [
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
]) {
  if (candidate) resolvePublicConfig({ supabaseKey: candidate });
}

export const publicConfig = resolvePublicConfig({
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  production: process.env.NODE_ENV === "production",
});
