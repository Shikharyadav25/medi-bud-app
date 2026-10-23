"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { ReportDTO } from "@medi-bud/contracts";
import { apiClient } from "@/lib/api";
import { getCurrentAccessToken } from "@/lib/supabase";
import { ReportUploadZone } from "@/components/ReportUploadZone";
import { ObservationTable } from "@/components/ObservationTable";
import {
  FileText,
  Download,
  MessageSquare,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Inbox,
} from "lucide-react";

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);

  const fetchReports = async () => {
    setErrorMsg(null);
    try {
      const data = await apiClient.getReports();
      setReports((previous) =>
        data.map((row) => ({
          ...previous.find((old) => old.id === row.id),
          ...row,
        })),
      );
      setSelectedId((current) =>
        current && data.some((r) => r.id === current)
          ? current
          : (data[0]?.id ?? null),
      );
    } catch {
      setReports([]);
      setErrorMsg(
        "Reports could not be loaded. Sign in and check the service connection.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDemo(
      process.env.NODE_ENV !== "production" &&
        process.env.NEXT_PUBLIC_DEMO_MODE === "true" &&
        localStorage.getItem("medi_bud_demo_token") === "demo_jwt_token",
    );
    fetchReports();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    apiClient
      .getReport(selectedId)
      .then((detail) => {
        if (!cancelled)
          setReports((previous) =>
            previous.some((r) => r.id === detail.id)
              ? previous.map((r) => (r.id === detail.id ? detail : r))
              : [detail, ...previous],
          );
      })
      .catch(() => {
        if (!cancelled)
          setErrorMsg("Report details could not be loaded. Please retry.");
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const handleUploadFn = async (file: File, consentAI: boolean) => {
    return apiClient.uploadReport(file, file.name, consentAI);
  };

  const handleUploadSuccess = (reportId: string, filename: string) => {
    fetchReports();
    setSelectedId(reportId);
  };

  const handleSaveObservations = async (
    updated: Array<{
      id: string;
      status: "confirmed" | "rejected";
      numeric_value?: number;
      value_text?: string;
    }>,
  ) => {
    if (!selectedReport) return;
    try {
      await apiClient.updateObservations(selectedReport.id, updated);
      const detail = await apiClient.getReport(selectedReport.id);
      setReports((previous) =>
        previous.map((r) => (r.id === detail.id ? detail : r)),
      );
    } catch {
      setErrorMsg(
        "Changes were not saved. Your report has not been updated on the server.",
      );
      throw new Error("Save failed");
    }
  };

  const handleDownload = async (reportId: string, filename: string) => {
    setErrorMsg(null);
    try {
      const token = await getCurrentAccessToken();
      if (!token) throw new Error("Please sign in before downloading.");
      const url = apiClient
        .getDownloadUrl(reportId)
        .replace(/\/download$/, "/file");
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!response.ok) throw new Error("The report could not be downloaded.");
      const objectUrl = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = filename.replace(/[\\/]/g, "_");
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : "Download failed.");
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedId) || reports[0];

  return (
    <div className="space-y-8">
      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {errorMsg}
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-(--text-primary)">
          Lab Reports & Observation Review
        </h1>
        <p className="text-sm text-(--text-secondary) mt-1">
          Upload diagnostic lab panels, verify extracted biomarkers, and ground
          your health discussions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-1">
          {demo && (
            <section className="panel space-y-3 border-amber-200">
              <h2 className="font-semibold">Try a sample report</h2>
              <p className="text-sm">
                Clearly labeled synthetic values, not real health data. Load it
                here, review the extracted results, then ask questions.
              </p>
              <button
                className="primary-button"
                disabled={sampleBusy}
                onClick={async () => {
                  setSampleBusy(true);
                  try {
                    const sample = await apiClient.useDemoReport();
                    await fetchReports();
                    setSelectedId(sample.report_id);
                  } catch {
                    setErrorMsg(
                      "The sample could not be loaded. Check that the local demo API is running.",
                    );
                  } finally {
                    setSampleBusy(false);
                  }
                }}
              >
                {sampleBusy
                  ? "Loading sample…"
                  : "Load / select synthetic report"}
              </button>
            </section>
          )}
          <ReportUploadZone
            uploadFn={handleUploadFn}
            onUploadSuccess={handleUploadSuccess}
          />

          <div className="rounded-2xl border border-(--border-subtle) bg-(--surface) p-4 space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-(--text-muted)">
              Uploaded Documents ({reports.length})
            </h2>
            <div className="space-y-2">
              {reports.map((report) => (
                <button
                  key={report.id}
                  onClick={() => setSelectedId(report.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    selectedReport?.id === report.id
                      ? "border-(--primary) bg-(--primary-surface)"
                      : "border-(--border-subtle) hover:bg-(--surface-subtle)"
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 shrink-0 text-(--primary)" />
                    <div className="truncate">
                      <p className="font-medium truncate text-(--text-primary)">
                        {report.filename}
                      </p>
                      <p className="text-[11px] text-(--text-muted)">
                        {report.report_date || "Undated"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                      report.status === "ready"
                        ? "bg-emerald-100 text-emerald-800"
                        : report.status === "review_needed"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {report.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedReport ? (
            <div className="rounded-2xl border border-(--border-subtle) bg-(--surface) p-6 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-subtle) pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold text-(--text-primary)">
                      {selectedReport.filename}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-(--primary-light) text-(--primary)">
                      {selectedReport.status}
                    </span>
                  </div>
                  <p className="text-xs text-(--text-muted) mt-0.5">
                    Report Date:{" "}
                    {selectedReport.report_date || "Self-submitted"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleDownload(selectedReport.id, selectedReport.filename)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--border-subtle) text-xs font-medium text-(--text-secondary) hover:bg-(--surface-subtle) transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </button>
                  <Link
                    href={`/chat?report_id=${selectedReport.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--primary) text-white text-xs font-medium hover:bg-(--primary-hover) transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask AI with Citations
                  </Link>
                  <button
                    className="px-3 py-2 text-xs text-red-700 border border-red-200 rounded-xl"
                    onClick={async () => {
                      if (
                        !window.confirm(
                          "Delete this report and its extracted values? This cannot be undone.",
                        )
                      )
                        return;
                      try {
                        await apiClient.deleteReport(selectedReport.id);
                        setSelectedId(null);
                        await fetchReports();
                      } catch {
                        setErrorMsg(
                          "This report was not deleted. Please try again.",
                        );
                      }
                    }}
                  >
                    Delete report
                  </button>
                </div>
              </div>

              {selectedReport.observations &&
              selectedReport.observations.length > 0 ? (
                <ObservationTable
                  key={
                    selectedReport.id +
                    JSON.stringify(selectedReport.observations)
                  }
                  observations={selectedReport.observations}
                  onSaveObservations={handleSaveObservations}
                />
              ) : (
                <div className="text-center py-10 space-y-2">
                  <Clock className="w-8 h-8 text-(--text-muted) mx-auto animate-pulse" />
                  <p className="text-xs text-(--text-secondary) font-medium">
                    No supported values could be extracted. The file may be
                    scanned, unreadable, or use an unsupported report format.
                    Review the original with your clinician.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center border border-(--border-subtle) rounded-2xl bg-(--surface) space-y-3">
              <Inbox className="w-10 h-10 text-(--text-muted) mx-auto" />
              <p className="text-sm font-medium text-(--text-secondary)">
                No lab report selected
              </p>
              <p className="text-xs text-(--text-muted)">
                Upload a PDF or image report to inspect extracted biomarker
                values.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
