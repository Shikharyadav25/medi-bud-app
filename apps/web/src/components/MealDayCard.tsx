'use client';

import type { DayPlanDTO } from '@medi-bud/contracts';
import { Utensils, Coffee, Sun, Sunset, Moon } from 'lucide-react';

interface MealDayCardProps {
  dayPlan: DayPlanDTO;
  isSelected: boolean;
  onSelect: () => void;
}

const SLOT_ICONS = {
  breakfast: Coffee,
  lunch: Sun,
  snack: Utensils,
  dinner: Moon,
};

export function MealDayCard({ dayPlan, isSelected, onSelect }: MealDayCardProps) {
  const slots: Array<'breakfast' | 'lunch' | 'snack' | 'dinner'> = [
    'breakfast',
    'lunch',
    'snack',
    'dinner',
  ];

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer rounded-2xl border p-4 transition-all ${
        isSelected
          ? 'border-(--primary) bg-(--surface) shadow-sm ring-1 ring-(--primary)'
          : 'border-(--border-subtle) bg-(--surface) hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-(--border-subtle)">
        <div>
          <h3 className="font-semibold text-sm text-(--text-primary)">
            Day {dayPlan.day}
          </h3>
          <p className="text-[11px] text-(--text-muted)">
            Total: {dayPlan.daily_nutrition_summary.calories} kcal
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-(--text-secondary)">
          <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700">
            {dayPlan.daily_nutrition_summary.protein_g}g Protein
          </span>
          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700">
            {dayPlan.daily_nutrition_summary.carbs_g}g Carbs
          </span>
        </div>
      </div>

      <div className="space-y-2 mt-3">
        {slots.map((slot) => {
          const meal = dayPlan.meals[slot];
          const Icon = SLOT_ICONS[slot];
          return (
            <div key={slot} className="flex items-center justify-between text-xs py-1">
              <div className="flex items-center gap-2 truncate">
                <div className="p-1 rounded bg-(--surface-subtle) text-(--text-muted) shrink-0">
                  <Icon className="w-3 h-3" />
                </div>
                <div className="truncate">
                  <span className="capitalize font-medium text-[11px] text-(--text-muted) block">
                    {slot}
                  </span>
                  <span className="font-medium text-(--text-primary) truncate block text-xs">
                    {meal.name}
                  </span>
                </div>
              </div>
              <span className="text-[11px] text-(--text-secondary) shrink-0">
                {meal.nutrition.calories} kcal
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
