"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Droplets,
  Moon,
  Footprints,
  ArrowUpRight,
  Plus,
  Files,
  MessagesSquare,
  Sun,
  Check,
  LoaderCircle,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import type { ReportDTO, ReminderDTO } from "@medi-bud/contracts";

export default function DashboardPage() {
  const [water, setWater] = useState(0);
  const [sleep, setSleep] = useState<number | null>(null);
  const [activity, setActivity] = useState(0);
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [reminders, setReminders] = useState<
    Array<ReminderDTO & { completed?: boolean }>
  >([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [entry, setEntry] = useState<"sleep" | "activity" | null>(null);
  const [amount, setAmount] = useState("");
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profile, logs, reps, rems] = await Promise.all([
        apiClient.getProfile(),
        apiClient.getLogs(undefined, 500),
        apiClient.getReports(),
        apiClient.getReminders(),
      ]);
      const today = new Date().toLocaleDateString("en-CA");
      const todays = logs.filter(
        (log) =>
          new Date(log.occurred_at).toLocaleDateString("en-CA") === today,
      );
      setName(profile.name === "User" ? "" : profile.name);
      setWater(
        todays
          .filter((l) => l.kind === "water")
          .reduce((sum, l) => sum + Number(l.value), 0),
      );
      setActivity(
        todays
          .filter((l) => l.kind === "activity")
          .reduce((sum, l) => sum + Number(l.value), 0),
      );
      setSleep(todays.find((l) => l.kind === "sleep")?.value ?? null);
      setReports(reps);
      setReminders(rems);
      setHasData(true);
      setError("");
    } catch {
      setError(
        "Your health space could not be loaded. Check your connection and sign in to your account.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const log = async (kind: "water" | "sleep" | "activity", value: number) => {
    setBusy(true);
    setError("");
    try {
      await apiClient.createLog({
        kind,
        value,
        unit: kind === "water" ? "ml" : kind === "sleep" ? "hours" : "minutes",
        occurred_at: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        mutation_id: crypto.randomUUID(),
        payload_hash: "",
      });
      setEntry(null);
      setAmount("");
      await load();
    } catch {
      setError(
        "This entry was not saved. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const complete = async (id: string) => {
    setBusy(true);
    try {
      await apiClient.completeReminder(id, {
        due_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        mutation_id: crypto.randomUUID(),
      });
      await load();
    } catch {
      setError("The reminder could not be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  if (!hasData)
    return (
      <section className="panel space-y-3">
        <h1 className="page-title">Your daily overview</h1>
        {loading ? (
          <p role="status">Loading your saved health information…</p>
        ) : (
          <>
            <p role="alert">
              {error ||
                "Your health service is unavailable. No saved measurements could be loaded."}
            </p>
            <button className="primary-button" onClick={() => void load()}>
              Retry loading
            </button>
            <p>
              No measurements are shown until they can be loaded from your
              account.
            </p>
          </>
        )}
      </section>
    );
  return (
    <div>
      <div className="page-eyebrow">
        <span className="status-dot" /> YOUR DAILY OVERVIEW{" "}
        <span className="ml-auto">
          {new Date().toLocaleDateString("en-IN", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>
      <div className="page-heading">
        <div>
          <h1 className="page-title">
            A little care, every day{name ? ", " + name.split(" ")[0] : ""}.
          </h1>
          <p className="page-subtitle">
            Make room for small habits. Your health space starts with you.
          </p>
        </div>
        <Link className="primary-button" href="/reports">
          <Plus size={17} /> Add a report
        </Link>
      </div>
      {error && (
        <div role="alert" className="notice error-notice mb-5">
          {error}{" "}
          <Link href="/login" className="underline">
            Sign in
          </Link>{" "}
          ·{" "}
          <button onClick={() => void load()} className="underline">
            Retry
          </button>
        </div>
      )}
      {loading && (
        <p role="status" className="mb-4 flex items-center gap-2 text-sm">
          <LoaderCircle size={17} className="animate-spin" /> Loading your
          health space…
        </p>
      )}
      <div className="stat-grid">
        <section className="stat-card">
          <span className="feature-icon mint">
            <Droplets size={23} />
          </span>
          <h2>Water journal</h2>
          <div className="stat-value">
            {water.toLocaleString()}
            <small>ml logged today</small>
          </div>
          <p>Follow the fluid goal agreed with your clinician.</p>
          <button
            disabled={busy || loading}
            onClick={() => void log("water", 250)}
          >
            <Plus size={13} className="inline mr-1" />
            Log 250 ml
          </button>
        </section>
        <section className="stat-card">
          <span className="feature-icon lilac">
            <Moon size={23} />
          </span>
          <h2>Last night's rest</h2>
          <div className="stat-value">
            {sleep ?? "—"}
            <small>{sleep === null ? "not logged" : "hours"}</small>
          </div>
          <p>A moment to notice how rested you feel.</p>
          <button
            disabled={busy || loading}
            onClick={() => {
              setEntry("sleep");
              setAmount("");
            }}
          >
            <Plus size={13} className="inline mr-1" />
            Log sleep
          </button>
        </section>
        <section className="stat-card">
          <span className="feature-icon peach">
            <Footprints size={23} />
          </span>
          <h2>Movement today</h2>
          <div className="stat-value">
            {activity}
            <small>minutes logged</small>
          </div>
          <p>Every walk, stretch, and small step counts.</p>
          <button
            disabled={busy || loading}
            onClick={() => {
              setEntry("activity");
              setAmount("");
            }}
          >
            <Plus size={13} className="inline mr-1" />
            Log movement
          </button>
        </section>
      </div>
      {entry && (
        <form
          className="panel mt-5 flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void log(entry, Number(amount));
          }}
        >
          <label className="text-sm" htmlFor="habit-amount">
            {entry === "sleep" ? "Hours of sleep" : "Minutes of movement"}
            <input
              id="habit-amount"
              className="block mt-2 border border-(--border-medium) px-3 w-40"
              type="number"
              min="0"
              max={entry === "sleep" ? 24 : 1440}
              step={entry === "sleep" ? 0.25 : 1}
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          <button disabled={busy} className="primary-button">
            {busy ? "Saving…" : "Save entry"}
          </button>
          <button
            type="button"
            onClick={() => setEntry(null)}
            className="text-sm p-2"
          >
            Cancel
          </button>
        </form>
      )}
      <div className="dashboard-columns">
        <section className="panel">
          <div className="flex items-center justify-between mb-5">
            <h2 className="panel-title">Your health library</h2>
            <Link href="/reports" className="text-link">
              View all <ArrowUpRight size={16} />
            </Link>
          </div>
          {reports.length === 0 ? (
            <div className="empty-state">
              <Files size={30} className="mx-auto mb-3 text-(--primary)" />
              <p>No reports here yet.</p>
              <p className="text-xs mt-1 mb-4">
                Add your first report and keep the details together.
              </p>
              <Link href="/reports" className="text-link">
                Upload a report <ArrowUpRight size={15} />
              </Link>
            </div>
          ) : (
            reports.slice(0, 4).map((r) => (
              <Link href="/reports" key={r.id} className="dashboard-row">
                <Files size={20} className="text-(--primary)" />
                <div>
                  {r.filename}
                  <br />
                  <small>{r.report_date || "Report date not provided"}</small>
                </div>
                <span className="status-badge">
                  {r.status === "ready" ? "Reviewed" : "Needs review"}
                </span>
              </Link>
            ))
          )}
        </section>
        <section className="panel">
          <div className="flex items-center justify-between mb-5">
            <h2 className="panel-title">A gentle reminder</h2>
            <Sun size={19} className="text-amber-600" />
          </div>
          {reminders.length === 0 ? (
            <div className="empty-state">
              <p>No reminders yet.</p>
              <p className="text-xs mt-1">
                Give a daily habit a little space in your day.
              </p>
            </div>
          ) : (
            reminders.map((r) => (
              <div className="dashboard-row" key={r.id}>
                <button
                  disabled={busy || r.completed}
                  onClick={() => void complete(r.id)}
                  aria-label={"Complete " + r.label}
                  className="rounded-full border border-(--border-medium) p-2"
                >
                  {r.completed ? <Check size={15} /> : <Plus size={15} />}
                </button>
                <div>
                  {r.label}
                  <br />
                  <small>{r.user_entered_schedule}</small>
                </div>
              </div>
            ))
          )}
          <form
            className="mt-5 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              setBusy(true);
              try {
                await apiClient.createReminder({
                  label: String(data.get("label")),
                  user_entered_schedule: String(data.get("time")),
                  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                  enabled: true,
                });
                form.reset();
                await load();
              } catch {
                setError("The reminder was not saved.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <label htmlFor="reminder-label" className="text-xs">
              Add a personal reminder
            </label>
            <input
              id="reminder-label"
              name="label"
              required
              maxLength={120}
              placeholder="e.g. Take a screen break"
              className="w-full border border-(--border-medium) px-3 text-sm"
            />
            <div className="flex gap-3">
              <input
                name="time"
                type="time"
                aria-label="Reminder time"
                required
                className="border border-(--border-medium) px-3 text-sm flex-1 min-w-0"
              />
              <button className="primary-button" disabled={busy || loading}>
                Add
              </button>
            </div>
            <p className="text-xs text-(--text-muted)">
              Journal reminders are shown here; device notifications are not
              scheduled.
            </p>
          </form>
        </section>
      </div>
      <section className="gentle-banner">
        <span className="mint-icon">
          <MessagesSquare size={23} />
        </span>
        <div>
          <h3>A question on your mind?</h3>
          <p>
            Bring it to Medi Bud. Explore source-based answers at your own pace.
          </p>
        </div>
        <Link href="/chat" className="text-link">
          Let's talk <ArrowUpRight size={16} />
        </Link>
      </section>
    </div>
  );
}
