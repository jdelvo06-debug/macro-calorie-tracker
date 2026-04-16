import { useEffect, useState } from "react";

import { getFoodLogs, type FoodLogEntry } from "../lib/db-client";
import { getGoals, type GoalsRow } from "../lib/db-client";
import { addDays, toDateKey, toFriendlyDate } from "../lib/date";

const base = '/macro-calorie-tracker/';
import { MEAL_LABELS, MEAL_ORDER } from "../lib/types";
import MacroBar from "./MacroBar";
import ProgressRing from "./ProgressRing";

function friendlyDate(dateKey: string): string {
  const today = toDateKey();
  if (dateKey === today) return "Today";
  if (dateKey === addDays(today, -1)) return "Yesterday";
  return toFriendlyDate(dateKey);
}

export default function Dashboard() {
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [goals, setGoals] = useState<GoalsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = toDateKey();

  useEffect(() => {
    async function init() {
      setLoading(true);
      setError(null);

      try {
        const [logsData, goalsData] = await Promise.all([
          getFoodLogs(today),
          getGoals(),
        ]);
        setLogs(logsData);
        setGoals(goalsData);
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load data.");
        setLogs([]);
        setGoals(null);
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [today]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
        <div className="h-64 bg-zinc-800/50 rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const dailyCalories = goals?.daily_calories ?? 2000;
  const proteinPct = goals?.protein_pct ?? 30;
  const carbsPct = goals?.carbs_pct ?? 40;
  const fatPct = goals?.fat_pct ?? 30;

  const proteinTarget = (dailyCalories * (proteinPct / 100)) / 4;
  const carbsTarget = (dailyCalories * (carbsPct / 100)) / 4;
  const fatTarget = (dailyCalories * (fatPct / 100)) / 9;

  const totals = logs.reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories * log.servings,
      protein: acc.protein + log.protein * log.servings,
      carbs: acc.carbs + log.carbs * log.servings,
      fat: acc.fat + log.fat * log.servings,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const mealGroups = MEAL_ORDER.map((type) => ({
    type,
    label: MEAL_LABELS[type],
    items: logs.filter((item) => item.meal_type === type),
  })).filter((group) => group.items.length > 0);

  const remaining = dailyCalories - totals.calories;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{friendlyDate(today)}</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {remaining > 0
              ? `${Math.round(remaining)} kcal remaining`
              : `${Math.round(Math.abs(remaining))} kcal over target`}
          </p>
        </div>
        <a
          href={`${base}log?date=${today}&meal=breakfast`}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-sm font-medium hover:bg-emerald-500/20 active:scale-[0.98] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Log Food
        </a>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-surface border border-border-subtle p-6">
        <div className="flex flex-col sm:flex-row items-center gap-8">
          <ProgressRing value={totals.calories} max={dailyCalories} label="kcal" />
          <div className="flex-1 w-full space-y-4">
            <MacroBar label="Protein" current={totals.protein} target={proteinTarget} color="protein" />
            <MacroBar label="Carbs" current={totals.carbs} target={carbsTarget} color="carbs" />
            <MacroBar label="Fat" current={totals.fat} target={fatTarget} color="fat" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-medium text-zinc-300">Today's Meals</h2>

        {mealGroups.length === 0 ? (
          <div className="rounded-2xl bg-surface border border-border-subtle p-8 text-center">
            <p className="text-zinc-500 text-sm">No meals logged yet today.</p>
            <a
              href={`${base}log?date=${today}&meal=breakfast`}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-sm font-medium hover:bg-zinc-700 transition-colors"
            >
              Log your first meal
            </a>
          </div>
        ) : (
          mealGroups.map((group) => {
            const groupCalories = group.items.reduce((sum, item) => sum + item.calories * item.servings, 0);
            return (
              <div key={group.type} className="rounded-2xl bg-surface border border-border-subtle overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-surface-raised">
                  <span className="text-sm font-medium text-zinc-300">{group.label}</span>
                  <span className="text-xs font-mono text-zinc-500">{Math.round(groupCalories)} kcal</span>
                </div>
                <div className="divide-y divide-border-subtle">
                  {group.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-5 py-3 hover:bg-zinc-800/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200 truncate">{item.food_name}</p>
                        {item.brand && <p className="text-xs text-zinc-500 truncate">{item.brand}</p>}
                      </div>
                      <div className="flex items-center gap-4 ml-4 shrink-0">
                        <span className="text-xs text-zinc-500 font-mono">
                          {item.servings !== 1 ? `${item.servings}x ` : ""}
                          {Math.round(item.calories * item.servings)} kcal
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}