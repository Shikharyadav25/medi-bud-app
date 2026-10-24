"use client";
import { useEffect, useState } from "react";
import { UserRound, Download, Trash2, ShieldCheck } from "lucide-react";
import { apiClient, apiBaseUrl } from "@/lib/api";
import { supabase, getCurrentAccessToken } from "@/lib/supabase";
import { offlineDb } from "@/lib/offlineDb";

export default function AccountPage() {
  const [name, setName] = useState("");
  const [version, setVersion] = useState(1);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  useEffect(() => {
    apiClient
      .getProfile()
      .then((p) => {
        setName(p.name === "User" ? "" : p.name);
        setVersion(p.version);
      })
      .catch(() => setMessage("Sign in to manage your account."));
  }, []);
  const download = async () => {
    setBusy(true);
    setMessage("");
    try {
      const token = await getCurrentAccessToken();
      if (!token) throw new Error("Please sign in first.");
      const response = await fetch(apiBaseUrl + "/v1/me/export", {
        headers: { Authorization: "Bearer " + token },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Your export could not be prepared.");
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = "medi-bud-personal-data.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        "Your export has been downloaded. Store it somewhere private.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="max-w-3xl space-y-6">
      <div className="page-eyebrow">
        <span className="status-dot" /> YOUR HEALTH SPACE
      </div>
      <h1 className="page-title">Your account, your choices.</h1>
      <p className="page-subtitle">
        Manage your profile and the health information you keep with Medi Bud.
      </p>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <form
        className="panel space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const p = await apiClient.updateProfile({ name, version });
            setVersion(p.version);
            setMessage("Your profile was saved.");
          } catch {
            setMessage("Changes were not saved. Refresh and try again.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="panel-title flex items-center gap-2">
          <UserRound size={20} />A little about you
        </h2>
        <label htmlFor="profile-name" className="text-sm block">
          Your name
        </label>
        <input
          id="profile-name"
          maxLength={120}
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-(--border-medium) px-3"
        />
        <button disabled={busy} className="primary-button">
          Save profile
        </button>
      </form>
      <section className="panel space-y-4">
        <h2 className="panel-title flex items-center gap-2">
          <ShieldCheck size={20} />
          Your information
        </h2>
        <p className="text-sm text-(--text-secondary)">
          Download your API records, including original report files encoded in
          the export. Browser and device-only records may need a separate
          export.
        </p>
        <button
          className="primary-button"
          disabled={busy}
          onClick={() => void download()}
        >
          <Download size={17} />
          Download my data
        </button>
      </section>
      <section className="panel space-y-4">
        <h2 className="panel-title flex items-center gap-2">
          <Trash2 size={20} />
          Delete your account data
        </h2>
        <p className="text-sm text-(--text-secondary)">
          This removes your reports, chat history, plans, logs, and reminders
          from the active API database and revokes API access. Backups expire
          under the service's retention policy. Identity removal may require
          administrator completion if the identity service is unavailable.
        </p>
        <label htmlFor="delete-confirmation" className="text-sm block">
          Type DELETE to confirm
        </label>
        <input
          id="delete-confirmation"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          className="w-full border border-(--border-medium) px-3"
        />
        <button
          disabled={busy || confirmation !== "DELETE"}
          className="px-5 py-3 rounded-xl bg-red-700 text-white text-sm"
          onClick={async () => {
            setBusy(true);
            try {
              const token = await getCurrentAccessToken();
              if (!token) throw new Error("Please sign in first.");
              const res = await fetch(apiBaseUrl + "/v1/me", {
                method: "DELETE",
                headers: { Authorization: "Bearer " + token },
              });
              if (!res.ok) throw new Error();
              const data = await res.json();
              await supabase.auth.signOut({ scope: "local" });
              await Promise.all([
                offlineDb.pendingMutations.clear(),
                offlineDb.cachedLogs.clear(),
                offlineDb.cachedProfile.clear(),
              ]);
              setMessage(data.message);
              setConfirmation("");
            } catch {
              setMessage("Deletion could not be completed. Please try again.");
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete my data
        </button>
      </section>
    </div>
  );
}
