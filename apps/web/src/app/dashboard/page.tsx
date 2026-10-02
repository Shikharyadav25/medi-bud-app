'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Droplets, 
  Moon, 
  Flame, 
  CheckCircle2, 
  Clock, 
  FileText, 
  Upload, 
  Utensils, 
  MessageSquare,
  Plus
} from 'lucide-react';
import { apiClient } from '@/lib/api';
import { queueOfflineMutation } from '@/lib/offlineDb';

export default function DashboardPage() {
  const [waterMl, setWaterMl] = useState(1500);
  const [sleepHours, setSleepHours] = useState(7.5);
  const [activityMins, setActivityMins] = useState(30);
  const [reports, setReports] = useState<Array<{ id: string; filename: string; report_date?: string | null; status: string }>>([]);
  const [reminders, setReminders] = useState<Array<{ id: string; label: string; user_entered_schedule: string; completed?: boolean }>>([
    { id: 'rem-1', label: 'Morning hydration (2 glasses of water)', user_entered_schedule: '08:00 AM', completed: true },
    { id: 'rem-2', label: 'Evening brisk walk (30 mins)', user_entered_schedule: '06:00 PM', completed: false },
  ]);

  useEffect(() => {
    async function loadData() {
      try {
        const repList = await apiClient.getReports();
        setReports(repList);
      } catch {
        // Fallback default demonstration reports
        setReports([
          { id: 'rep-demo-1', filename: 'CBC_Metabolic_Panel.pdf', report_date: '2026-09-20', status: 'ready' },
          { id: 'rep-demo-2', filename: 'Lipid_Profile_Sept.pdf', report_date: '2026-09-28', status: 'review_needed' }
        ]);
      }
    }
    loadData();
  }, []);

  // Transparent habit calculation (4 target habits)
  const habitsDone = [
    waterMl >= 2000,
    sleepHours >= 7.0,
    activityMins >= 30,
    reminders.some(r => r.completed)
  ].filter(Boolean).length;

  const handleAddWater = async (amount: number) => {
    const nextWater = waterMl + amount;
    setWaterMl(nextWater);

    const mutation = {
      mutation_id: crypto.randomUUID(),
      user_id: 'current_user',
      device_id: 'web_browser',
      entity_type: 'health_log' as const,
      payload: { kind: 'water', value: nextWater, unit: 'ml' },
      payload_hash: String(Date.now()),
      occurred_at: new Date().toISOString(),
      timezone: 'Asia/Kolkata'
    };

    if (navigator.onLine) {
      try {
        await apiClient.createLog({
          kind: 'water',
          value: nextWater,
          unit: 'ml',
          occurred_at: new Date().toISOString(),
          timezone: 'Asia/Kolkata',
          mutation_id: mutation.mutation_id,
          payload_hash: mutation.payload_hash
        });
        return;
      } catch {
        // Fall through to offline queue
      }
    }
    await queueOfflineMutation(mutation);
  };

  const handleToggleReminder = (id: string) => {
    setReminders(prev => prev.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  return (
    <div className="space-y-6">
      {/* Habit Score Card */}
      <section className="p-6 rounded-2xl bg-(--surface) border border-(--border-subtle) flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-(--primary) uppercase tracking-wider">
            Daily Habits Completed
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-(--text-primary) mt-1">
            {habitsDone} of 4 Habits Completed Today
          </h2>
          <p className="text-xs text-(--text-muted) mt-0.5">
            Transparent tracking based on logged goals. Conditions and medications are never penalized.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                step <= habitsDone
                  ? 'bg-(--primary) text-white'
                  : 'bg-(--surface-subtle) text-(--text-muted) border border-(--border-subtle)'
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </section>

      {/* Habit Tracker Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Water */}
        <div className="p-4 rounded-xl bg-(--surface) border border-(--border-subtle) space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-secondary) flex items-center gap-1.5">
              <Droplets size={16} className="text-sky-600" />
              <span>Water Intake</span>
            </span>
            <span className="text-xs font-bold text-(--text-primary)">{waterMl} / 2500 ml</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-sky-500 h-2 rounded-full" style={{ width: `${Math.min(100, (waterMl / 2500) * 100)}%` }} />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleAddWater(250)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-(--border-medium) hover:bg-(--surface-subtle) flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> 250ml
            </button>
            <button
              onClick={() => handleAddWater(500)}
              className="flex-1 py-1.5 rounded-lg text-xs font-medium border border-(--border-medium) hover:bg-(--surface-subtle) flex items-center justify-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> 500ml
            </button>
          </div>
        </div>

        {/* Sleep */}
        <div className="p-4 rounded-xl bg-(--surface) border border-(--border-subtle) space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-secondary) flex items-center gap-1.5">
              <Moon size={16} className="text-indigo-600" />
              <span>Sleep Duration</span>
            </span>
            <span className="text-xs font-bold text-(--text-primary)">{sleepHours} hrs</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${Math.min(100, (sleepHours / 8) * 100)}%` }} />
          </div>
          <p className="text-[11px] text-(--text-muted)">Target: 7–8 hours of restorative sleep</p>
        </div>

        {/* Activity */}
        <div className="p-4 rounded-xl bg-(--surface) border border-(--border-subtle) space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-(--text-secondary) flex items-center gap-1.5">
              <Flame size={16} className="text-amber-600" />
              <span>Physical Activity</span>
            </span>
            <span className="text-xs font-bold text-(--text-primary)">{activityMins} mins</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${Math.min(100, (activityMins / 45) * 100)}%` }} />
          </div>
          <p className="text-[11px] text-(--text-muted)">WHO: 150+ minutes of moderate weekly exercise</p>
        </div>
      </section>

      {/* Reminders & Recent Reports */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Due Reminders */}
        <div className="p-5 rounded-2xl bg-(--surface) border border-(--border-subtle) space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-(--text-primary) flex items-center gap-2">
              <Clock size={16} className="text-(--primary)" />
              <span>User-Entered Reminders Due Today</span>
            </h3>
          </div>
          <div className="space-y-2">
            {reminders.map(rem => (
              <div
                key={rem.id}
                onClick={() => handleToggleReminder(rem.id)}
                className="p-3 rounded-xl border border-(--border-subtle) hover:bg-(--surface-subtle) flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 size={16} className={rem.completed ? 'text-emerald-600' : 'text-slate-300'} />
                  <span className={`text-xs ${rem.completed ? 'line-through text-(--text-muted)' : 'text-(--text-primary)'}`}>
                    {rem.label}
                  </span>
                </div>
                <span className="text-[11px] font-medium text-(--text-muted)">{rem.user_entered_schedule}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Reports Overview */}
        <div className="p-5 rounded-2xl bg-(--surface) border border-(--border-subtle) space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-(--text-primary) flex items-center gap-2">
              <FileText size={16} className="text-(--primary)" />
              <span>Lab Reports & Verification Status</span>
            </h3>
            <Link href="/reports" className="text-xs font-medium text-(--primary) hover:underline">
              View All
            </Link>
          </div>
          <div className="space-y-2">
            {reports.map(rep => (
              <div key={rep.id} className="p-3 rounded-xl border border-(--border-subtle) flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-(--text-primary)">{rep.filename}</p>
                  <p className="text-[11px] text-(--text-muted)">Date: {rep.report_date}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  rep.status === 'ready' 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {rep.status === 'ready' ? 'Ready & Cited' : 'Review Needed'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
