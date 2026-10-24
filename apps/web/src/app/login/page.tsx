"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { ShieldCheck, LogIn, UserPlus, Sparkles } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !isSupabaseConfigured) return;
    setLoading(true);
    setErrorMsg(null);
    setMessage("");

    try {
      if (isSignUp) {
        if (password !== confirmPassword)
          throw new Error("Passwords do not match.");
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { name: name.trim() },
            emailRedirectTo: window.location.origin + "/auth/callback",
          },
        });
        if (error) throw error;
        if (data.session) {
          router.push("/dashboard");
          return;
        }
        setMessage(
          "Check your email to confirm your account, then sign in. If no email arrives, check spam or use Resend confirmation below.",
        );
        setPassword("");
        setConfirmPassword("");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Authentication failed";
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    // Generate/store demo session token for offline or local preview
    localStorage.setItem("medi_bud_demo_token", "demo_jwt_token");
    localStorage.setItem(
      "medi_bud_demo_user",
      "00000000-0000-0000-0000-000000000001",
    );
    router.push("/dashboard");
  };

  return (
    <div className="max-w-md mx-auto py-8">
      <div className="p-6 sm:p-8 rounded-2xl border border-(--border-subtle) bg-(--surface) shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-(--primary-surface) text-(--primary) flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-xl font-bold text-(--text-primary)">
            {isSignUp ? "Create Medi Bud Account" : "Sign in to Medi Bud"}
          </h2>
          <p className="text-xs text-(--text-muted)">
            Your own space for a little more health clarity.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs"
          >
            {errorMsg}
          </div>
        )}
        {message && (
          <p role="status" className="notice">
            {message}
          </p>
        )}

        {!isSupabaseConfigured && (
          <div
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900"
          >
            Real signup and sign-in need Supabase configuration. A local demo,
            when explicitly enabled in development, is not a registered user.
            Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
            to enable real accounts.
          </div>
        )}
        <form onSubmit={handleAuth} className="space-y-4">
          {isSignUp && (
            <label className="block text-sm" htmlFor="auth-name">
              Your name
              <input
                id="auth-name"
                autoComplete="name"
                required
                maxLength={120}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded-xl px-3"
              />
            </label>
          )}
          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-semibold text-(--text-secondary) mb-1"
            >
              Email Address
            </label>
            <input
              type="email"
              id="auth-email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 text-xs rounded-xl border border-(--border-medium) bg-(--surface) focus:outline-none focus:border-(--primary)"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-semibold text-(--text-secondary) mb-1"
            >
              Password
            </label>
            <input
              type="password"
              id="auth-password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              required
              minLength={isSignUp ? 8 : 1}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 text-xs rounded-xl border border-(--border-medium) bg-(--surface) focus:outline-none focus:border-(--primary)"
            />
          </div>

          {isSignUp && (
            <label className="block text-sm" htmlFor="auth-confirm-password">
              Confirm password
              <input
                id="auth-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full border rounded-xl px-3"
              />
            </label>
          )}
          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="w-full py-2.5 rounded-xl font-medium text-xs bg-(--primary) text-white hover:bg-(--primary-hover) transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {isSignUp ? <UserPlus size={14} /> : <LogIn size={14} />}
            <span>
              {loading ? "Processing..." : isSignUp ? "Sign Up" : "Sign In"}
            </span>
          </button>
        </form>
        {isSupabaseConfigured && (
          <div className="flex flex-wrap gap-3 text-xs">
            <a className="text-link" href="/auth/reset">
              Forgot password?
            </a>
            <button
              type="button"
              disabled={loading || !email}
              className="text-link"
              onClick={async () => {
                setLoading(true);
                setErrorMsg(null);
                try {
                  const { error } = await supabase.auth.resend({
                    type: "signup",
                    email: email.trim(),
                    options: {
                      emailRedirectTo:
                        window.location.origin + "/auth/callback",
                    },
                  });
                  if (error) throw error;
                  setMessage(
                    "If this address has a pending signup, a confirmation email will be sent. Check your inbox and spam folder.",
                  );
                } catch {
                  setErrorMsg(
                    "Confirmation could not be sent. Try again later.",
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              Resend confirmation
            </button>
          </div>
        )}
        {isSupabaseConfigured &&
          process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED === "true" && (
            <button
              type="button"
              disabled={loading}
              className="secondary-button w-full"
              onClick={async () => {
                setLoading(true);
                setErrorMsg(null);
                try {
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: "google",
                    options: {
                      redirectTo: window.location.origin + "/auth/callback",
                    },
                  });
                  if (error) {
                    throw error;
                  }
                } catch {
                  setErrorMsg(
                    "Google sign-in could not start. Check provider configuration and try again.",
                  );
                } finally {
                  setLoading(false);
                }
              }}
            >
              Continue with Google
            </button>
          )}

        {process.env.NODE_ENV !== "production" &&
          process.env.NEXT_PUBLIC_DEMO_MODE === "true" && (
            <div className="space-y-4">
              <p className="text-center text-xs text-(--text-muted)">
                Local demo mode
              </p>
              <button
                onClick={handleDemoSignIn}
                type="button"
                className="w-full py-2 rounded-xl border border-(--primary) text-(--primary) bg-(--primary-surface) hover:bg-emerald-100 transition-colors text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Sparkles size={14} />
                <span>Launch local demo</span>
              </button>
            </div>
          )}

        <div className="text-center pt-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg(null);
              setMessage("");
              setPassword("");
              setConfirmPassword("");
            }}
            className="text-xs text-(--text-secondary) hover:text-(--primary) transition-colors cursor-pointer"
          >
            {isSignUp
              ? "Already have an account? Sign in"
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
}
