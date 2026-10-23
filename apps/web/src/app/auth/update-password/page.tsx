"use client";
import { useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
export default function UpdatePassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("Checking recovery session…");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!isSupabaseConfigured) {
        if (active) setMessage("Authentication is not configured.");
        return;
      }
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (active) {
          setReady(Boolean(session));
          setMessage(
            session
              ? "Choose a new password."
              : "This recovery link is invalid or expired. Request another link in the same browser.",
          );
        }
      } catch {
        if (active) setMessage("Recovery session could not be verified.");
      }
    })();
    return () => {
      active = false;
    };
  }, []);
  return (
    <section className="panel max-w-lg mx-auto space-y-4">
      <h1 className="page-title">Choose a new password</h1>
      <p role="status">{message}</p>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setMessage("Passwords do not match.");
            return;
          }
          setBusy(true);
          try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            await supabase.auth.signOut({ scope: "local" });
            setReady(false);
            setPassword("");
            setConfirm("");
            setMessage("Password updated. Sign in with your new password.");
          } catch {
            setMessage(
              "Password could not be updated. Check the password policy or request a fresh recovery link.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          New password
          <input
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!ready}
            className="block border rounded-xl px-3 w-full"
          />
        </label>
        <label className="block">
          Confirm new password
          <input
            required
            type="password"
            minLength={8}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={!ready}
            className="block border rounded-xl px-3 w-full"
          />
        </label>
        <button disabled={!ready || busy} className="primary-button">
          Update password
        </button>
      </form>
      <a className="text-link" href="/login">
        Return to sign in
      </a>
    </section>
  );
}
