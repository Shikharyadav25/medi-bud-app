"use client";

import { useState } from "react";
import Link from "next/link";
import type { ChatImageDTO, ChatImageSavedDTO } from "@medi-bud/contracts";
import { apiClient } from "@/lib/api";

export function ChatImageResult({ result }: { result: ChatImageDTO }) {
  const [saved, setSaved] = useState<ChatImageSavedDTO | null>(null);
  const [discarded, setDiscarded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(save: boolean) {
    if (!result.draft_id || busy) return;
    setBusy(true);
    setError("");
    try {
      if (save) setSaved(await apiClient.saveChatImage(result.draft_id));
      else {
        await apiClient.discardChatImage(result.draft_id);
        setDiscarded(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save or discard this draft. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Image analysis review"
      className="space-y-3 rounded-xl border border-(--border-subtle) bg-(--surface) p-3 text-xs text-left"
    >
      <p className="font-semibold">
        {result.kind === "report"
          ? "Proposed report values — not confirmed"
          : result.kind === "meal"
            ? "Photo-based meal estimate"
            : "Image response"}
        {result.provider ? ` · ${result.provider}` : ""}
      </p>
      {result.tests.length > 0 && (
        <ul className="space-y-2">
          {result.tests.map((test, index) => (
            <li key={index}>
              <strong>{test.name}:</strong> {test.value} {test.unit}
              <br />
              <span className="text-(--text-secondary)">
                Printed range: {test.reference_range}
              </span>
            </li>
          ))}
        </ul>
      )}
      {result.food_items.length > 0 && (
        <ul className="space-y-2">
          {result.food_items.map((food, index) => (
            <li key={index}>
              <strong>{food.name}</strong> · {food.quantity}
              <br />
              Approx. {food.calories} kcal · protein {food.protein_g} g · carbs{" "}
              {food.carbs_g} g · fat {food.fat_g} g
            </li>
          ))}
        </ul>
      )}
      <p className="text-(--text-secondary)">{result.limitations}</p>
      {result.draft_id && !saved && !discarded && (
        <>
          <p>
            Not added to your saved context. This private draft expires in one
            hour.{" "}
            {result.kind === "report"
              ? "Save to Reports, then check and confirm every value against the original."
              : "Review the estimated portions above. Save only if you want this estimate included in your meal history; use manual logging if it is inaccurate."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => act(true)}
              className="rounded-lg bg-(--primary) text-white px-3 py-2 disabled:opacity-50"
            >
              {busy
                ? "Working…"
                : result.kind === "report"
                  ? "Save report for review"
                  : "Save reviewed meal estimate"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => act(false)}
              className="rounded-lg border px-3 py-2"
            >
              Discard private draft
            </button>
          </div>
        </>
      )}
      {saved && (
        <p role="status">
          {saved.kind === "report" ? (
            <Link className="underline" href="/reports">
              Saved. Open Reports to review and confirm values before account
              Q&amp;A uses them.
            </Link>
          ) : (
            "Saved as an estimated meal in your account context. The original photo was not retained with the meal."
          )}
        </p>
      )}
      {discarded && (
        <p role="status">
          Private draft deleted. Nothing was added to saved context. The
          response text remains on this screen until you leave.
        </p>
      )}
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
