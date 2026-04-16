import { useEffect, useState } from "react";

import { getGoals, updateGoals, type GoalsRow } from "../lib/db-client";

export default function GoalsSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calories, setCalories] = useState(2000);
  const [proteinPct, setProteinPct] = useState(30);
  const [carbsPct, setCarbsPct] = useState(40);
  const [fatPct, setFatPct] = useState(30);
  const [goalWeight, setGoalWeight] = useState("");

  useEffect(() => {
    async function loadGoals() {
      setLoading(true);
      setError(null);

      try {
        const data = await getGoals();
        setCalories(data.daily_calories ?? 2000);
        setProteinPct(data.protein_pct ?? 30);
        setCarbsPct(data.carbs_pct ?? 40);
        setFatPct(data.fat_pct ?? 30);
        setGoalWeight(data.goal_weight?.toString() || "");
      } catch (nextError) {
        setError(nextError instanceof Error ? nextError.message : "Failed to load goals.");
      } finally {
        setLoading(false);
      }
    }

    void loadGoals();
  }, []);

  const macroTotal = proteinPct + carbsPct + fatPct;
  const isValid = macroTotal === 100;

  const proteinGrams = (calories * (proteinPct / 100)) / 4;
  const carbsGrams = (calories * (carbsPct / 100)) / 4;
  const fatGrams = (calories * (fatPct / 100)) / 9;

  async function save() {
    if (!isValid) {
      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await updateGoals({
        daily_calories: calories,
        protein_pct: proteinPct,
        carbs_pct: carbsPct,
        fat_pct: fatPct,
        goal_weight: goalWeight ? parseFloat(goalWeight) : null,
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-zinc-800 rounded-lg animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-zinc-800/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
        <p className="text-sm text-zinc-500 mt-1">Set your daily targets</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="rounded-2xl bg-surface border border-border-subtle p-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-300">Daily Calorie Target</h2>
        <label className="relative block">
          <span className="sr-only">Daily calorie target</span>
          <input
            type="number"
            value={calories}
            onChange={(event) => setCalories(Number(event.target.value))}
            min={500}
            max={10000}
            step={50}
            className="w-full px-4 py-3 pr-14 rounded-xl bg-zinc-800/50 border border-border-subtle text-zinc-200 text-lg font-mono focus:outline-none focus:border-zinc-600"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">kcal</span>
        </label>
        <input
          aria-label="Daily calorie target slider"
          type="range"
          min={800}
          max={5000}
          step={50}
          value={calories}
          onChange={(event) => setCalories(Number(event.target.value))}
          className="w-full accent-emerald-500"
        />
        <div className="flex justify-between text-xs text-zinc-600">
          <span>800</span>
          <span>5000</span>
        </div>
      </div>

      <div className="rounded-2xl bg-surface border border-border-subtle p-5 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Macro Split</h2>
          <span className={`text-xs font-mono ${isValid ? "text-emerald-400" : "text-red-400"}`}>Total: {macroTotal}%</span>
        </div>

        <div className="h-3 rounded-full overflow-hidden flex bg-zinc-800">
          <div className="bg-protein h-full transition-all" style={{ width: `${proteinPct}%` }} />
          <div className="bg-carbs h-full transition-all" style={{ width: `${carbsPct}%` }} />
          <div className="bg-fat h-full transition-all" style={{ width: `${fatPct}%` }} />
        </div>

        {[
          {
            label: "Protein",
            pct: proteinPct,
            grams: proteinGrams,
            setPct: setProteinPct,
            color: "bg-protein",
            accent: "accent-blue-500",
          },
          {
            label: "Carbs",
            pct: carbsPct,
            grams: carbsGrams,
            setPct: setCarbsPct,
            color: "bg-carbs",
            accent: "accent-amber-500",
          },
          {
            label: "Fat",
            pct: fatPct,
            grams: fatGrams,
            setPct: setFatPct,
            color: "bg-fat",
            accent: "accent-red-500",
          },
        ].map((macro) => (
          <div key={macro.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${macro.color}`} />
                <span className="text-sm text-zinc-300">{macro.label}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-zinc-500 font-mono">{Math.round(macro.grams)}g</span>
                <div className="flex items-center rounded-lg bg-zinc-800/50 border border-border-subtle">
                  <button type="button" onClick={() => macro.setPct(Math.max(0, macro.pct - 5))} className="px-2 py-1 text-zinc-400 hover:text-zinc-200">
                    −
                  </button>
                  <span className="px-2 py-1 text-sm font-mono text-zinc-300 min-w-[3rem] text-center">{macro.pct}%</span>
                  <button type="button" onClick={() => macro.setPct(Math.min(100, macro.pct + 5))} className="px-2 py-1 text-zinc-400 hover:text-zinc-200">
                    +
                  </button>
                </div>
              </div>
            </div>
            <input
              aria-label={`${macro.label} percentage`}
              type="range"
              min={0}
              max={100}
              step={5}
              value={macro.pct}
              onChange={(event) => macro.setPct(Number(event.target.value))}
              className={`w-full ${macro.accent}`}
            />
          </div>
        ))}

        {!isValid && (
          <p className="text-xs text-red-400 bg-red-400/10 px-3 py-2 rounded-lg">
            Macro percentages must add up to 100%. Currently {macroTotal}%.
          </p>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          {[
            { label: "Balanced", p: 30, c: 40, f: 30 },
            { label: "High Protein", p: 40, c: 35, f: 25 },
            { label: "Low Carb", p: 35, c: 20, f: 45 },
            { label: "Keto", p: 20, c: 5, f: 75 },
          ].map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setProteinPct(preset.p);
                setCarbsPct(preset.c);
                setFatPct(preset.f);
              }}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 bg-zinc-800/50 border border-border-subtle hover:bg-zinc-800 hover:text-zinc-300 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl bg-surface border border-border-subtle p-5 space-y-4">
        <h2 className="text-sm font-medium text-zinc-300">Goal Weight</h2>
        <label className="relative block">
          <span className="sr-only">Goal weight in pounds</span>
          <input
            type="number"
            step="0.1"
            value={goalWeight}
            onChange={(event) => setGoalWeight(event.target.value)}
            placeholder="Optional"
            className="w-full px-4 py-3 pr-12 rounded-xl bg-zinc-800/50 border border-border-subtle text-zinc-200 font-mono focus:outline-none focus:border-zinc-600 placeholder:text-zinc-600"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">lbs</span>
        </label>
      </div>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving || !isValid}
        className={`w-full py-3.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
          saved ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
        } disabled:opacity-50`}
      >
        {saved ? "Saved" : saving ? "Saving..." : "Save Goals"}
      </button>
    </div>
  );
}