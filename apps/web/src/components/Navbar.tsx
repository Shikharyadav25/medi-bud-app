"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  HeartPulse,
  LayoutDashboard,
  Files,
  MessagesSquare,
  Utensils,
  ShieldPlus,
  MapPin,
  ArrowUpRight,
  Menu,
  X,
  LogOut,
  UserRound,
  UserPlus,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { offlineDb } from "@/lib/offlineDb";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/reports", label: "Health reports", icon: Files },
  { href: "/chat", label: "Ask Medi Bud", icon: MessagesSquare },
  { href: "/plan", label: "Meal planner", icon: Utensils },
  { href: "/symptoms", label: "Symptom guide", icon: ShieldPlus },
  { href: "/nearby", label: "Find care", icon: MapPin },
];
export function Navbar() {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [demo, setDemo] = useState(false);
  const [online, setOnline] = useState(true);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobile, setMobile] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const query = window.matchMedia("(max-width:767px)");
    const update = () => setMobile(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const main = document.getElementById("main-content");
    if (main) main.inert = true;
    const focusables = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>(
          "a,button:not([disabled])",
        ) || [],
      );
    focusables()[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
      if (event.key === "Tab") {
        const items = focusables();
        const first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.body.style.overflow = previous;
      if (main) main.inert = false;
      document.removeEventListener("keydown", trap);
    };
  }, [open, mobile]);
  useEffect(() => {
    void supabase.auth
      .getSession()
      .then(({ data }) => setSignedIn(Boolean(data.session)))
      .catch(() => setSignedIn(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) =>
      setSignedIn(Boolean(session)),
    );
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    setOpen(false);
    setDemo(
      process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
        localStorage.getItem("medi_bud_demo_token") === "demo_jwt_token",
    );
  }, [path]);
  const logout = async () => {
    setLoggingOut(true);
    setLogoutError("");
    try {
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      localStorage.removeItem("medi_bud_demo_token");
      localStorage.removeItem("medi_bud_demo_user");
      setDemo(false);
      await Promise.all([
        offlineDb.pendingMutations.clear(),
        offlineDb.cachedLogs.clear(),
        offlineDb.cachedProfile.clear(),
      ]);
      router.push("/login");
      router.refresh();
    } catch {
      setLogoutError(
        "Sign-out could not finish. Reconnect and try again; your session may still be active.",
      );
    } finally {
      setLoggingOut(false);
    }
  };
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="mobile-header">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <HeartPulse size={23} />
          </span>
          Medi Bud<span className="brand-dot">®</span>
        </Link>
        <div className="flex items-center gap-3">
          {!signedIn && !demo && (
            <Link href="/signup" className="text-link text-sm font-semibold">
              Sign up
            </Link>
          )}
          <button
            ref={trigger}
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="app-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      <aside
        ref={sidebar}
        inert={mobile && !open}
        aria-hidden={mobile && !open}
        className={`app-sidebar ${open ? "is-open" : ""}`}
        id="app-navigation"
      >
        {mobile && (
          <button
            className="self-end mb-3"
            aria-label="Close menu"
            onClick={() => {
              setOpen(false);
              trigger.current?.focus();
            }}
          >
            <X size={21} />
          </button>
        )}
        <Link href="/" className="brand">
          <span className="brand-mark">
            <HeartPulse size={23} />
          </span>
          Medi Bud<span className="brand-dot">®</span>
        </Link>
        <div className="workspace-label">YOUR HEALTH SPACE</div>
        <nav aria-label="Main navigation">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={path === href ? "page" : undefined}
              className={`side-link ${path === href ? "active" : ""}`}
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === href && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          {demo && (
            <p
              role="status"
              className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
            >
              Local demonstration. Use synthetic data only. This is not a real
              patient account.
            </p>
          )}
          <div className="care-note">
            <span className="note-symbol">+</span>
            <p>
              A little clarity.
              <br />
              <strong>A healthier everyday.</strong>
            </p>
            <Link href="/chat">
              Start a conversation <ArrowUpRight size={15} />
            </Link>
          </div>
          {!online && (
            <p className="offline-label">
              <WifiOff size={15} /> You’re offline. Changes may need a
              connection.
            </p>
          )}
          {!signedIn && !demo && (
            <Link
              href="/signup"
              className="primary-button justify-center w-full mb-2"
            >
              <UserPlus size={18} /> Create an account
            </Link>
          )}
          <Link
            href={signedIn || demo ? "/account" : "/login"}
            className="side-link"
          >
            <UserRound size={19} />
            {signedIn || demo ? "Your account" : "Sign in"}
          </Link>
          {(signedIn || demo) && (
            <button
              className="side-link w-full"
              disabled={loggingOut}
              onClick={logout}
            >
              <LogOut size={18} />
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          )}
          {logoutError && (
            <p role="alert" className="text-xs text-red-700 p-2">
              {logoutError}
            </p>
          )}
          <p className="sidebar-caption">
            A thoughtful companion for your health.
          </p>
        </div>
      </aside>
      {open && (
        <button
          className="nav-backdrop"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}
