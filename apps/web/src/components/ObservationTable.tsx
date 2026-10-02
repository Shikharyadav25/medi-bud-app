'use client';

import { useState } from 'react';
import type { ReportObservationDTO } from '@medi-bud/contracts';
import { Check, X, Edit3, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface ObservationTableProps {
  observations: ReportObservationDTO[];
  onSaveObservations: (
    updated: Array<{ id: string; status: 'confirmed' | 'rejected'; numeric_value?: number; value_text?: string }>
  ) => Promise<void>;
}

export function ObservationTable({ observations, onSaveObservations }: ObservationTableProps) {
  const [items, setItems] = useState<ReportObservationDTO[]>(observations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleStatusChange = (id: string, newStatus: 'confirmed' | 'rejected') => {
    setItems((prev) =>
      prev.map((obs) => (obs.id === id ? { ...obs, status: newStatus } : obs))
    );
    setSaveSuccess(false);
  };

  const handleStartEdit = (obs: ReportObservationDTO) => {
    setEditingId(obs.id);
    setEditValue(obs.value_text);
  };

  const handleConfirmEdit = (id: string) => {
    const num = parseFloat(editValue);
    setItems((prev) =>
      prev.map((obs) =>
        obs.id === id
          ? {
              ...obs,
              value_text: editValue,
              numeric_value: isNaN(num) ? obs.numeric_value : num,
              status: 'confirmed',
            }
          : obs
      )
    );
    setEditingId(null);
    setSaveSuccess(false);
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const payload = items.map((obs) => ({
        id: obs.id,
        status: obs.status as 'confirmed' | 'rejected',
        numeric_value: obs.numeric_value ?? undefined,
        value_text: obs.value_text,
      }));
      await onSaveObservations(payload);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-(--text-primary)">
            Extracted Lab Observations
          </h3>
          <p className="text-xs text-(--text-muted)">
            Verify and confirm values extracted from your report before they are used for cited AI Q&A.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="px-3.5 py-1.5 rounded-xl bg-(--primary) text-white text-xs font-medium hover:bg-(--primary-hover) disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Confirm Observations'}
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-(--border-subtle) bg-(--surface)">
        <table className="w-full text-left text-xs">
          <thead className="bg-(--surface-subtle) text-(--text-secondary) font-medium border-b border-(--border-subtle)">
            <tr>
              <th className="px-4 py-3">Biomarker / Test</th>
              <th className="px-4 py-3">Observed Value</th>
              <th className="px-4 py-3">Reference Range</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-(--border-subtle)">
            {items.map((obs) => (
              <tr key={obs.id} className="hover:bg-(--surface-subtle) transition-colors">
                <td className="px-4 py-3 font-medium text-(--text-primary)">
                  {obs.original_label}
                  {obs.canonical_test !== obs.original_label && (
                    <span className="block text-[11px] text-(--text-muted)">
                      {obs.canonical_test}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-(--text-primary)">
                  {editingId === obs.id ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-20 px-2 py-1 rounded border border-(--primary) text-xs"
                      />
                      <button
                        onClick={() => handleConfirmEdit(obs.id)}
                        className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                        title="Accept"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span>
                      {obs.comparator ? `${obs.comparator} ` : ''}
                      {obs.value_text} {obs.unit}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-(--text-secondary)">
                  {obs.reference_text || (obs.bounds_low != null && obs.bounds_high != null ? `${obs.bounds_low} - ${obs.bounds_high} ${obs.unit}` : 'Not provided')}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                      obs.status === 'confirmed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : obs.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {obs.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => handleStartEdit(obs)}
                      className="p-1 text-(--text-secondary) hover:text-(--text-primary) hover:bg-slate-100 rounded"
                      title="Edit value"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(obs.id, 'confirmed')}
                      className={`p-1 rounded ${
                        obs.status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'text-(--text-muted) hover:text-emerald-600 hover:bg-emerald-50'
                      }`}
                      title="Confirm value"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleStatusChange(obs.id, 'rejected')}
                      className={`p-1 rounded ${
                        obs.status === 'rejected'
                          ? 'bg-rose-100 text-rose-700'
                          : 'text-(--text-muted) hover:text-rose-600 hover:bg-rose-50'
                      }`}
                      title="Reject value"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
