'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  RED_FLAG_QUESTIONS, 
  evaluateSymptomAnswers, 
  EMERGENCY_CONTACTS,
  type SymptomEvaluationResult 
} from '@medi-bud/safety-content';
import { 
  ShieldAlert, 
  PhoneCall, 
  AlertTriangle, 
  CheckCircle2, 
  Info,
  MapPin,
  HeartPulse
} from 'lucide-react';

export default function SymptomsPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [evaluation, setEvaluation] = useState<SymptomEvaluationResult>(() =>
    evaluateSymptomAnswers([])
  );

  const handleToggle = (id: string) => {
    const nextIds = selectedIds.includes(id)
      ? selectedIds.filter((item) => item !== id)
      : [...selectedIds, id];

    setSelectedIds(nextIds);
    setEvaluation(evaluateSymptomAnswers(nextIds));
  };

  const handleReset = () => {
    setSelectedIds([]);
    setEvaluation(evaluateSymptomAnswers([]));
  };

  const isEmergency = evaluation.level === 'emergency';
  const isSoon = evaluation.level === 'soon';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-(--text-primary) flex items-center gap-2">
          <HeartPulse className="w-6 h-6 text-rose-600" />
          Symptom Guidance & Red-Flag Triage
        </h1>
        <p className="text-sm text-(--text-secondary) mt-1">
          Deterministic safety evaluation to identify acute clinical red flags and direct users to emergency services.
        </p>
      </div>

      <div
        className={`p-6 rounded-2xl border transition-all ${
          isEmergency
            ? 'bg-red-50 border-red-300 text-red-950 shadow-sm'
            : isSoon
            ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}
      >
        <div className="flex items-start gap-4">
          <div
            className={`p-2.5 rounded-xl ${
              isEmergency
                ? 'bg-red-600 text-white'
                : isSoon
                ? 'bg-amber-600 text-white'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isEmergency ? (
              <ShieldAlert className="w-6 h-6" />
            ) : isSoon ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div className="space-y-1.5 flex-1">
            <h2 className="text-lg font-bold">
              {evaluation.headline}
            </h2>
            <p className="text-xs leading-relaxed opacity-90">
              {evaluation.guidanceText}
            </p>
            <div className="pt-2">
              <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-md bg-white/70">
                Action: {evaluation.recommendedAction}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-(--text-primary)">
              Check any symptoms you or the person are experiencing:
            </h3>
            {selectedIds.length > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-(--text-muted) hover:text-(--text-primary) underline"
              >
                Clear all ({selectedIds.length})
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {RED_FLAG_QUESTIONS.map((q) => {
              const isChecked = selectedIds.includes(q.id);
              return (
                <label
                  key={q.id}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-colors text-xs ${
                    isChecked
                      ? q.severity === 'emergency'
                        ? 'border-red-400 bg-red-50/60'
                        : 'border-amber-400 bg-amber-50/60'
                      : 'border-(--border-subtle) bg-(--surface) hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggle(q.id)}
                    className="mt-0.5 w-4 h-4 accent-red-600 rounded shrink-0"
                  />
                  <div className="space-y-1">
                    <p className="font-medium text-(--text-primary)">{q.prompt}</p>
                    <p className="text-[11px] text-(--text-muted)">{q.explanation}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-(--text-primary)">
            Verified Indian Emergency Contacts
          </h3>
          <div className="space-y-3">
            {EMERGENCY_CONTACTS.map((contact) => (
              <div
                key={contact.number}
                className="p-3.5 rounded-xl border border-(--border-subtle) bg-(--surface) space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-(--text-primary)">
                    {contact.label}
                  </span>
                  <a
                    href={`tel:${contact.number.replace(/-/g, '')}`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors"
                  >
                    <PhoneCall className="w-3 h-3" />
                    {contact.number}
                  </a>
                </div>
                <p className="text-[11px] text-(--text-secondary)">
                  {contact.description}
                </p>
                <p className="text-[10px] text-(--text-muted) border-t border-(--border-subtle) pt-1.5">
                  Source: {contact.source}
                </p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-(--border-subtle) bg-(--surface-subtle) space-y-2">
            <h4 className="text-xs font-semibold text-(--text-primary) flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-(--primary)" />
              Need Physical Care Nearby?
            </h4>
            <p className="text-[11px] text-(--text-secondary)">
              Discover verified hospitals, clinics, and pharmacies within 5 km of your location.
            </p>
            <Link
              href="/nearby"
              className="inline-block text-xs font-medium text-(--primary) hover:underline pt-1"
            >
              Browse Nearby Medical Facilities &rarr;
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
