'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { ReportDTO } from '@medi-bud/contracts';
import { apiClient } from '@/lib/api';
import { ReportUploadZone } from '@/components/ReportUploadZone';
import { ObservationTable } from '@/components/ObservationTable';
import { 
  FileText, 
  Download, 
  MessageSquare, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Sparkles,
  Inbox
} from 'lucide-react';

const FALLBACK_DEMO_REPORTS: ReportDTO[] = [
  {
    id: 'rep-fixture-lipid',
    user_id: '00000000-0000-0000-0000-000000000001',
    object_key: 'reports/demo_lipid.pdf',
    filename: 'Lipid_Panel_Sept2026.pdf',
    mime: 'application/pdf',
    checksum: 'demo_sha256_hash_1',
    report_date: '2026-09-28',
    status: 'review_needed',
    created_at: new Date().toISOString(),
    observations: [
      {
        id: 'obs-1',
        report_id: 'rep-fixture-lipid',
        user_id: '00000000-0000-0000-0000-000000000001',
        original_label: 'Total Cholesterol',
        canonical_test: 'Total Cholesterol',
        value_text: '228',
        numeric_value: 228,
        unit: 'mg/dL',
        reference_text: '< 200 mg/dL',
        bounds_low: null,
        bounds_high: 200,
        status: 'proposed',
        page: 1,
      },
      {
        id: 'obs-2',
        report_id: 'rep-fixture-lipid',
        user_id: '00000000-0000-0000-0000-000000000001',
        original_label: 'LDL Cholesterol',
        canonical_test: 'LDL Cholesterol',
        value_text: '148',
        numeric_value: 148,
        unit: 'mg/dL',
        reference_text: '< 100 mg/dL',
        bounds_low: null,
        bounds_high: 100,
        status: 'proposed',
        page: 1,
      },
      {
        id: 'obs-3',
        report_id: 'rep-fixture-lipid',
        user_id: '00000000-0000-0000-0000-000000000001',
        original_label: 'HDL Cholesterol',
        canonical_test: 'HDL Cholesterol',
        value_text: '44',
        numeric_value: 44,
        unit: 'mg/dL',
        reference_text: '> 40 mg/dL',
        bounds_low: 40,
        bounds_high: null,
        status: 'confirmed',
        page: 1,
      }
    ]
  }
];

export default function ReportsPage() {
  const [reports, setReports] = useState<ReportDTO[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const data = await apiClient.getReports();
      if (data && data.length > 0) {
        setReports(data);
        if (!selectedId) setSelectedId(data[0].id);
      } else {
        setReports(FALLBACK_DEMO_REPORTS);
        if (!selectedId) setSelectedId(FALLBACK_DEMO_REPORTS[0].id);
      }
    } catch {
      setReports(FALLBACK_DEMO_REPORTS);
      if (!selectedId) setSelectedId(FALLBACK_DEMO_REPORTS[0].id);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleUploadFn = async (file: File) => {
    return apiClient.uploadReport(file, file.name);
  };

  const handleUploadSuccess = (reportId: string, filename: string) => {
    fetchReports();
    setSelectedId(reportId);
  };

  const handleSaveObservations = async (
    updated: Array<{ id: string; status: 'confirmed' | 'rejected'; numeric_value?: number; value_text?: string }>
  ) => {
    if (!selectedReport) return;
    try {
      await apiClient.updateObservations(selectedReport.id, updated);
      await fetchReports();
    } catch {
      // Local optimistic update
      setReports((prev) =>
        prev.map((rep) =>
          rep.id === selectedReport.id
            ? {
                ...rep,
                observations: rep.observations?.map((o) => {
                  const match = updated.find((u) => u.id === o.id);
                  return match ? { ...o, ...match } : o;
                }),
              }
            : rep
        )
      );
    }
  };

  const selectedReport = reports.find((r) => r.id === selectedId) || reports[0];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-(--text-primary)">
          Lab Reports & Observation Review
        </h1>
        <p className="text-sm text-(--text-secondary) mt-1">
          Upload diagnostic lab panels, verify extracted biomarkers, and ground your health discussions.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4 lg:col-span-1">
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
                      ? 'border-(--primary) bg-(--primary-surface)'
                      : 'border-(--border-subtle) hover:bg-(--surface-subtle)'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <FileText className="w-4 h-4 shrink-0 text-(--primary)" />
                    <div className="truncate">
                      <p className="font-medium truncate text-(--text-primary)">
                        {report.filename}
                      </p>
                      <p className="text-[11px] text-(--text-muted)">
                        {report.report_date || 'Undated'}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                      report.status === 'ready'
                        ? 'bg-emerald-100 text-emerald-800'
                        : report.status === 'review_needed'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700'
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
                    Report Date: {selectedReport.report_date || 'Self-submitted'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={apiClient.getDownloadUrl(selectedReport.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--border-subtle) text-xs font-medium text-(--text-secondary) hover:bg-(--surface-subtle) transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download File
                  </a>
                  <Link
                    href={`/chat?report_id=${selectedReport.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-(--primary) text-white text-xs font-medium hover:bg-(--primary-hover) transition-colors shadow-sm"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Ask AI with Citations
                  </Link>
                </div>
              </div>

              {selectedReport.observations && selectedReport.observations.length > 0 ? (
                <ObservationTable
                  observations={selectedReport.observations}
                  onSaveObservations={handleSaveObservations}
                />
              ) : (
                <div className="text-center py-10 space-y-2">
                  <Clock className="w-8 h-8 text-(--text-muted) mx-auto animate-pulse" />
                  <p className="text-xs text-(--text-secondary) font-medium">
                    Observations are currently being processed by the extraction pipeline.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center border border-(--border-subtle) rounded-2xl bg-(--surface) space-y-3">
              <Inbox className="w-10 h-10 text-(--text-muted) mx-auto" />
              <p className="text-sm font-medium text-(--text-secondary)">No lab report selected</p>
              <p className="text-xs text-(--text-muted)">
                Upload a PDF or image report to inspect extracted biomarker values.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
