"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const privatePages = new Set([
  "/dashboard",
  "/reports",
  "/chat",
  "/plan",
  "/account",
]);

/** Remount private pages on identity changes, including sign-out in another tab. */
export function AccountBoundary({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [identity, setIdentity] = useState<{
    owner: string | null;
    checking: boolean;
  }>({ owner: null, checking: true });
  useEffect(() => {
    let active = true;
    const demo = () =>
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
      localStorage.getItem("medi_bud_demo_token") === "demo_jwt_token"
        ? "local-demo"
        : null;
    if (!isSupabaseConfigured) {
      setIdentity({ owner: demo(), checking: false });
      return;
    }
    // Ignore an old lookup if a newer auth event has already established ownership.
    let revision = 0;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      revision++;
      if (active)
        setIdentity({ owner: session?.user.id || demo(), checking: false });
    });
    const initial = revision;
    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (active && revision === initial)
          setIdentity({
            owner: !error ? data.session?.user.id || demo() : null,
            checking: false,
          });
      })
      .catch(() => {
        if (active && revision === initial)
          setIdentity({ owner: null, checking: false });
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [pathname]);
  if (!privatePages.has(pathname)) return <>{children}</>;
  if (identity.checking)
    return (
      <p role="status" className="panel">
        Checking your account…
      </p>
    );
  if (!identity.owner)
    return (
      <section className="panel max-w-lg mx-auto space-y-3">
        <h1 className="page-title">Your health space is private.</h1>
        <p>Sign in to view or save your reports, journal and conversations.</p>
        <div className="flex flex-wrap gap-3">
          <Link className="primary-button" href="/signup">
            Create an account
          </Link>
          <Link className="secondary-button" href="/login">
            Sign in
          </Link>
        </div>
      </section>
    );
  return <div key={identity.owner}>{children}</div>;
}
