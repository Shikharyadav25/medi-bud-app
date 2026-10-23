"use client";
import { useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
export default function ResetPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="panel max-w-lg mx-auto space-y-4">
      <h1 className="page-title">Reset your password</h1>
      <p>We’ll send a recovery link if an account exists for this email.</p>
      {!isSupabaseConfigured && (
        <p role="alert">Real authentication has not been configured.</p>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: window.location.origin + "/auth/update-password",
            });
            if (error) throw error;
            setMessage(
              "If an account exists, check your email for a recovery link. Use the same browser to finish.",
            );
          } catch {
            setMessage("Recovery could not be requested. Try again later.");
          } finally {
            setBusy(false);
          }
        }}
        className="space-y-4"
      >
        <label className="block">
          Email address
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="block w-full border rounded-xl px-3"
          />
        </label>
        <button
          className="primary-button"
          disabled={busy || !isSupabaseConfigured}
        >
          Send recovery link
        </button>
      </form>
      <p role="status">{message}</p>
      <a href="/login" className="text-link">
        Back to sign in
      </a>
    </section>
  );
}
