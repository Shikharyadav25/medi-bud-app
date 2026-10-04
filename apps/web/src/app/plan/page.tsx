'use client';

import { useState, useEffect } from 'react';
import type { MealPlanDTO } from '@medi-bud/contracts';
import { apiClient } from '@/lib/api';
import { getCurrentAccessToken } from '@/lib/supabase';
import { MealDayCard } from '@/components/MealDayCard';
import { 
  Utensils, 
  Download, 
  RefreshCw, 
  Check, 
  AlertCircle, 
  Leaf, 
  ShieldCheck,
  FileText
} from 'lucide-react';

const COMMON_ALLERGENS = [
  'dairy',
  'peanuts',
  'tree_nuts',
  'gluten',
  'soy',
  'mustard',
  'sesame'
];

export default function MealPlanPage() {
  const [isVeg, setIsVeg] = useState(true);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('Pan-Indian');
  const [plan, setPlan] = useState<MealPlanDTO | null>(null);
  const [selectedDayNum, setSelectedDayNum] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.getMealPlan();
      setPlan(data);
    } catch {
      setErrorMsg('Could not fetch saved plan. Generating initial plan...');
      await handleGeneratePlan();
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlan = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await apiClient.generateMealPlan({
        is_veg: isVeg,
        allergens: selectedAllergens,
        regional_preference: selectedRegion,
      });
      setPlan(data);
      setSelectedDayNum(1);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Plan generation failed';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlan();
  }, []);

  const toggleAllergen = (item: string) => {
    setSelectedAllergens((prev) =>
      prev.includes(item) ? prev.filter((a) => a !== item) : [...prev, item]
    );
  };

  const handleDownloadPdf = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!plan?.id) return;
    try {
      const token = await getCurrentAccessToken();
      const base = apiClient.getPlanPdfUrl(plan.id);
      const url = token ? `${base}?token=${encodeURIComponent(token)}` : base;
      window.open(url, '_blank');
    } catch {
      window.open(apiClient.getPlanPdfUrl(plan.id), '_blank');
    }
  };

  const selectedDay = plan?.days.find((d) => d.day === selectedDayNum) || plan?.days[0];

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-subtle) pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-(--text-primary) flex items-center gap-2">
            <Utensils className="w-6 h-6 text-(--primary)" />
            7-Day Indian Wellness Meal Planner
          </h1>
          <p className="text-xs text-(--text-secondary) mt-1">
            Nutritional estimates calibrated against ICMR-NIN Indian Food Composition Tables (IFCT).
          </p>
        </div>

        {plan && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPdf}
              type="button"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-(--primary) text-white text-xs font-medium hover:bg-(--primary-hover) transition-colors shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Plan PDF
            </button>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 rounded-2xl border border-(--border-subtle) bg-(--surface) space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-xs font-medium text-(--text-primary) cursor-pointer">
              <input
                type="checkbox"
                checked={isVeg}
                onChange={(e) => setIsVeg(e.target.checked)}
                className="w-4 h-4 accent-teal-600 rounded"
              />
              <span className="flex items-center gap-1">
                <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                Pure Vegetarian
              </span>
            </label>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-(--text-muted)">Region:</span>
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-2.5 py-1 rounded-lg border border-(--border-subtle) bg-(--surface-subtle) text-xs"
              >
                <option value="Pan-Indian">Pan-Indian</option>
                <option value="North">North Indian</option>
                <option value="South">South Indian</option>
                <option value="West">West Indian</option>
                <option value="East">East Indian</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleGeneratePlan}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-(--primary) text-(--primary) hover:bg-(--primary-surface) text-xs font-medium transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Regenerating...' : 'Regenerate 7-Day Plan'}
          </button>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-(--border-subtle)">
          <span className="text-[11px] font-medium text-(--text-muted) block">
            Declared Allergen Exclusions:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {COMMON_ALLERGENS.map((allergen) => (
              <button
                key={allergen}
                onClick={() => toggleAllergen(allergen)}
                className={`text-[11px] px-2.5 py-1 rounded-full border capitalize transition-colors ${
                  selectedAllergens.includes(allergen)
                    ? 'border-red-400 bg-red-50 text-red-700 font-medium'
                    : 'border-(--border-subtle) bg-(--surface) text-(--text-secondary) hover:border-slate-300'
                }`}
              >
                {selectedAllergens.includes(allergen) ? '✕ ' : '+ '}
                {allergen.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {plan && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {plan.days.map((dayPlan) => (
              <MealDayCard
                key={dayPlan.day}
                dayPlan={dayPlan}
                isSelected={selectedDay?.day === dayPlan.day}
                onSelect={() => setSelectedDayNum(dayPlan.day)}
              />
            ))}
          </div>

          {selectedDay && (
            <div className="rounded-2xl border border-(--border-subtle) bg-(--surface) p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-(--border-subtle) pb-3">
                <h2 className="font-semibold text-base text-(--text-primary)">
                  Detailed Breakdown — Day {selectedDay.day}
                </h2>
                <div className="flex items-center gap-3 text-xs">
                  <span><strong>{selectedDay.daily_nutrition_summary.calories}</strong> kcal</span>
                  <span><strong>{selectedDay.daily_nutrition_summary.protein_g}g</strong> protein</span>
                  <span><strong>{selectedDay.daily_nutrition_summary.carbs_g}g</strong> carbs</span>
                  <span><strong>{selectedDay.daily_nutrition_summary.fat_g}g</strong> fats</span>
                  <span><strong>{selectedDay.daily_nutrition_summary.fiber_g}g</strong> fiber</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(['breakfast', 'lunch', 'snack', 'dinner'] as const).map((slot) => {
                  const m = selectedDay.meals[slot];
                  return (
                    <div key={slot} className="p-4 rounded-xl border border-(--border-subtle) bg-(--surface-subtle) space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="uppercase text-[11px] font-bold tracking-wider text-(--text-muted)">
                          {slot}
                        </span>
                        <span className="text-xs font-semibold text-(--primary)">
                          {m.nutrition.calories} kcal
                        </span>
                      </div>
                      <p className="font-medium text-sm text-(--text-primary)">
                        {m.name}
                      </p>
                      <p className="text-xs text-(--text-muted)">
                        Portion: {m.portion_basis}
                      </p>
                      <div className="flex gap-2 text-[11px] text-(--text-secondary) pt-1">
                        <span>P: {m.nutrition.protein_g}g</span>
                        <span>C: {m.nutrition.carbs_g}g</span>
                        <span>F: {m.nutrition.fat_g}g</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-(--text-muted) italic pt-2 border-t border-(--border-subtle)">
                {plan.disclaimer}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
