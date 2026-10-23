"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
export default function AuthCallback() {
  const [message, setMessage] = useState("Completing secure sign-in…");
  const router = useRouter();
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isSupabaseConfigured) {
        setMessage("Authentication is not configured.");
        return;
      }
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.has("error"))
          throw new Error("Authentication link was rejected or expired.");
        let {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session && params.get("code")) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            params.get("code")!,
          );
          if (error) throw error;
          session = data.session;
        }
        if (!session) throw new Error("No session was established.");
        if (active) router.replace("/dashboard");
      } catch {
        if (active)
          setMessage(
            "This sign-in link is invalid, expired, or was opened in a different browser. Return to sign in, or request another confirmation email.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);
  return (
    <section className="panel max-w-lg mx-auto">
      <h1 className="page-title">Account confirmation</h1>
      <p role="status">{message}</p>
      <a href="/login" className="text-link">
        Return to sign in
      </a>
    </section>
  );
}
