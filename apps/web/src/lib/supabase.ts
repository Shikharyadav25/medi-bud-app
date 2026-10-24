import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "./publicConfig";

export const supabase = createClient(
  publicConfig.supabaseUrl,
  publicConfig.supabaseKey,
  {
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
            : AbortSignal.timeout(15000),
        }),
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce",
    },
  },
);

// Real sessions only. An explicitly enabled local demo may use a demo token;
// shared demo identity must never be used automatically for public users.
export const isSupabaseConfigured = publicConfig.authConfigured;

let sessionOwner: string | null = null;
let sessionRevision = 0;
if (typeof window !== "undefined" && isSupabaseConfigured) {
  supabase.auth.onAuthStateChange((_event, session) => {
    const next = session?.user.id || null;
    if (next !== sessionOwner) {
      sessionOwner = next;
      sessionRevision++;
    }
  });
}

export async function getCurrentAccessToken(): Promise<string | null> {
  const revision = sessionRevision;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (revision !== sessionRevision)
      throw new Error("Account changed. Retry from the current account.");
    if (session?.access_token) return session.access_token;
  } catch {
    // Fail closed when Supabase cannot refresh the session.
  }

  if (
    !isSupabaseConfigured &&
    process.env.NODE_ENV !== "production" &&
    process.env.NEXT_PUBLIC_DEMO_MODE === "true"
  ) {
    return typeof window === "undefined"
      ? null
      : localStorage.getItem("medi_bud_demo_token");
  }
  return null;
}
