import { useEffect, useState } from "react";

import { apiRequest, messageFromError } from "../lib/api";
import type { FoodLog } from "../lib/types";
import { MEAL_LABELS } from "../lib/types";

interface Props {
  foodId: string;
}

interface NutrientRow {
  label: string;
  value: number | null;
  unit: string;
  color?: string;
}

function parseVitamins(value: string | null): Record<string, number | null> {
  if (!value) {
    return {};
  }

  try {
    return JSON.parse(value) as Record<string, number | null>;
  } catch {
    return {};
  }
}

export default function NutritionDetail({ foodId }: Props) {
  const [item, setItem] = useState<FoodLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadItem() {
      setLoading(true);
      setError(null);

      try {
        const data = await apiRequest<FoodLog>(`/api/food-item?id=${foodId}`);
        setItem(data);
      } catch (nextError) {
        setError(messageFromError(nextError));
        setItem(null);
      } finally {
        setLoading(false);
      }
    }

    void loadItem();
  }, [foodId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-48 bg-zinc-800/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="rounded-2xl bg-surface border border-border-subtle p-8 text-center">
        <p className="text-zinc-400">{error || "Food item not found."}</p>
        <a href="/diary" className="text-emerald-400 text-sm mt-2 inline-block hover:underline">
          Back to diary
        </a>
      </div>
    );
  }

  const multiplier = item.servings;
  const vitamins = parseVitamins(item.vitamins);

  const mainNutrients: NutrientRow[] = [
    { label: "Calories", value: item.calories * multiplier, unit: "kcal" },
    { label: "Protein", value: item.protein * multiplier, unit: "g", color: "text-protein" },
    { label: "Carbohydrates", value: item.carbs * multiplier, unit: "g", color: "text-carbs" },
    { label: "Fat", value: item.fat * multiplier, unit: "g", color: "text-fat" },
    { label: "Fiber", value: item.fiber != null ? item.fiber * multiplier : null, unit: "g" },
    { label: "Sugar", value: item.sugar != null ? item.sugar * multiplier : null, unit: "g" },
    { label: "Sodium", value: item.sodium != null ? item.sodium * multiplier : null, unit: "mg" },
  ];

  const vitaminRows: NutrientRow[] = [
    { label: "Vitamin A", value: vitamins.vitamin_a != null ? vitamins.vitamin_a * multiplier : null, unit: "mcg" },
    { label: "Vitamin C", value: vitamins.vitamin_c != null ? vitamins.vitamin_c * multiplier : null, unit: "mg" },
    { label: "Calcium", value: vitamins.calcium != null ? vitamins.calcium * multiplier : null, unit: "mg" },
    { label: "Iron", value: vitamins.iron != null ? vitamins.iron * multiplier : null, unit: "mg" },
    { label: "Potassium", value: vitamins.potassium != null ? vitamins.potassium * multiplier : null, unit: "mg" },
  ].filter((row) => row.value !== null);

  const proteinCals = item.protein * multiplier * 4;
  const carbsCals = item.carbs * multiplier * 4;
  const fatCals = item.fat * multiplier * 9;
  const totalMacroCals = proteinCals + carbsCals + fatCals;
  const proteinPct = totalMacroCals > 0 ? (proteinCals / totalMacroCals) * 100 : 0;
  const carbsPct = totalMacroCals > 0 ? (carbsCals / totalMacroCals) * 100 : 0;
  const fatPct = totalMacroCals > 0 ? (fatCals / totalMacroCals) * 100 : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div>
        <a href="/diary" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors inline-flex items-center gap-1 mb-3">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
          Back to diary
        </a>
        <h1 className="text-2xl font-semibold tracking-tight">{item.food_name}</h1>
        {item.brand && <p className="text-sm text-zinc-500 mt-1">{item.brand}</p>}
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-400">
            {MEAL_LABELS[item.meal_type]}
          </span>
          <span className="text-xs text-zinc-600">
            {item.servings}x {item.serving_size || "serving"}
          </span>
        </div>
      </div>

      <div className="rounded-2xl bg-surface border border-border-subtle p-5">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Macro Split</h2>
        <div className="h-3 rounded-full overflow-hidden flex bg-zinc-800">
          <div className="bg-protein h-full transition-all" style={{ width: `${proteinPct}%` }} />
          <div className="bg-carbs h-full transition-all" style={{ width: `${carbsPct}%` }} />
          <div className="bg-fat h-full transition-all" style={{ width: `${fatPct}%` }} />
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-protein" />
            <span className="text-xs text-zinc-400">Protein {Math.round(proteinPct)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-carbs" />
            <span className="text-xs text-zinc-400">Carbs {Math.round(carbsPct)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-fat" />
            <span className="text-xs text-zinc-400">Fat {Math.round(fatPct)}%</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-surface border border-border-subtle overflow-hidden">
        <div className="px-5 py-3 bg-surface-raised">
          <h2 className="text-sm font-medium text-zinc-300">Nutrition Facts</h2>
        </div>
        <div className="divide-y divide-border-subtle">
          {mainNutrients.map((nutrient) =>
            nutrient.value !== null ? (
              <div key={nutrient.label} className="flex items-center justify-between px-5 py-3">
                <span className={`text-sm ${nutrient.color || "text-zinc-300"}`}>{nutrient.label}</span>
                <span className="text-sm font-mono text-zinc-400">
                  {nutrient.unit === "kcal" ? Math.round(nutrient.value) : nutrient.value.toFixed(1)} {nutrient.unit}
                </span>
              </div>
            ) : null,
          )}
        </div>
      </div>

      {vitaminRows.length > 0 && (
        <div className="rounded-2xl bg-surface border border-border-subtle overflow-hidden">
          <div className="px-5 py-3 bg-surface-raised">
            <h2 className="text-sm font-medium text-zinc-300">Vitamins & Minerals</h2>
          </div>
          <div className="divide-y divide-border-subtle">
            {vitaminRows.map((vitamin) => (
              <div key={vitamin.label} className="flex items-center justify-between px-5 py-3">
                <span className="text-sm text-zinc-300">{vitamin.label}</span>
                <span className="text-sm font-mono text-zinc-400">
                  {vitamin.value!.toFixed(2)} {vitamin.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
