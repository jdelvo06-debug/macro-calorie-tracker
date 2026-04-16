import { useEffect, useState } from "react";

import { getFoodLogs, addFoodLog, updateFoodLog, deleteFoodLog, type FoodLogEntry } from "../lib/db-client";
import { getGoals, type GoalsRow } from "../lib/db-client";
import { addDays, parseDateKey, toDateKey } from "../lib/date";

const base = '/macro-calorie-tracker/';
import type { MealType } from "../lib/types";
import { MEAL_LABELS, MEAL_ORDER } from "../lib/types";

interface EditDraft {
  id?: number;
  date: string;
  meal_type: MealType;
  food_name: string;
  brand: string;
  serving_size: string;
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number | null;
  sugar: number | null;
  sodium: number | null;
  vitamins: string | null;
  barcode: string | null;
}

function toEditDraft(item: FoodLogEntry): EditDraft {
  return {
    id: item.id,
    date: item.date,
    meal_type: item.meal_type,
    food_name: item.food_name,
    brand: item.brand ?? "",
    serving_size: item.serving_size ?? "",
    servings: item.servings,
    calories: item.calories,
    protein: item.protein,
    carbs: item.carbs,
    fat: item.fat,
    fiber: item.fiber,
    sugar: item.sugar,
    sodium: item.sodium,
    vitamins: item.vitamins,
    barcode: item.barcode,
  };
}

export default function Diary() {
  const [date, setDate] = useState(toDateKey());
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [goals, setGoals] = useState<GoalsRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<number | undefined>(undefined);
  const [savingId, setSavingId] = useState<number | undefined>(undefined);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function loadData(nextDate: string) {
    setLoading(true);
    setError(null);

    try {
      const [logsData, goalsData] = await Promise.all([
        getFoodLogs(nextDate),
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

  useEffect(() => {
    void loadData(date);
  }, [date]);

  async function handleDeleteEntry(id: number | undefined) {
    if (!id) return;
    setDeleting(id);
    setActionMessage(null);

    try {
      await deleteFoodLog(id);
      setLogs((current) => current.filter((item) => item.id !== id));
      setActionMessage({ text: "Entry deleted.", isError: false });
      if (editingId === id) {
        setEditingId(undefined);
        setDraft(null);
      }
    } catch (nextError) {
      setActionMessage({ text: nextError instanceof Error ? nextError.message : "Failed to delete.", isError: true });
    } finally {
      setDeleting(undefined);
    }
  }

  async function saveEdit() {
    if (!draft) return;

    setSavingId(draft.id);
    setActionMessage(null);

    try {
      await updateFoodLog({
        ...draft,
        brand: draft.brand || null,
        serving_size: draft.serving_size || null,
      });

      setLogs((current) =>
        current.map((item) =>
          item.id === draft.id
            ? { ...item, ...draft, brand: draft.brand || null, serving_size: draft.serving_size || null }
            : item,
        ),
      );
      setEditingId(undefined);
      setDraft(null);
      setActionMessage({ text: "Entry updated.", isError: false });
    } catch (nextError) {
      setActionMessage({ text: nextError instanceof Error ? nextError.message : "Failed to save.", isError: true });
    } finally {
      setSavingId(undefined);
    }
  }

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
    items: logs.filter((log) => log.meal_type === type),
  }));

  const displayDate = parseDateKey(date);
  const isToday = date === toDateKey();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Diary</h1>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-surface border border-border-subtle p-2">
        <button
          type="button"
          aria-label="Show previous day"
          onClick={() => setDate((current) => addDays(current, -1))}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-medium text-zinc-200">
            {displayDate?.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
          </p>
          {isToday && <p className="text-xs text-emerald-400">Today</p>}
        </div>
        <button
          type="button"
          aria-label="Show next day"
          onClick={() => setDate((current) => addDays(current, 1))}
          className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {actionMessage && (
        <div className={`rounded-xl px-4 py-3 text-sm ${actionMessage.isError ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {actionMessage.text}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-zinc-800/50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {mealGroups.map((group) => {
            const groupCals = group.items.reduce((sum, item) => sum + item.calories * item.servings, 0);
            const groupProtein = group.items.reduce((sum, item) => sum + item.protein * item.servings, 0);
            const groupCarbs = group.items.reduce((sum, item) => sum + item.carbs * item.servings, 0);
            const groupFat = group.items.reduce((sum, item) => sum + item.fat * item.servings, 0);

            return (
              <div key={group.type} className="rounded-2xl bg-surface border border-border-subtle overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-surface-raised">
                  <span className="text-sm font-medium text-zinc-300">{group.label}</span>
                  <span className="text-xs font-mono text-zinc-500">{Math.round(groupCals)} kcal</span>
                </div>

                {group.items.length === 0 ? (
                  <div className="px-5 py-6 text-center">
                    <p className="text-xs text-zinc-600">No items logged</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border-subtle">
                    {group.items.map((item) => {
                      const editing = editingId === item.id && draft?.id === item.id;

                      return (
                        <div key={item.id}>
                          <div className="flex items-start gap-3 px-5 py-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-zinc-200 truncate">{item.food_name}</p>
                              <div className="flex flex-wrap items-center gap-3 mt-1">
                              <span className="text-xs font-mono text-zinc-500">
                                {Math.round(item.calories * item.servings)} kcal
                              </span>
                              {item.servings !== 1 && (
                                <span className="text-xs text-zinc-600">
                                  {item.servings} × {item.serving_size || "serving"}
                                </span>
                              )}
                                <span className="text-xs text-protein/70">P {Math.round(item.protein * item.servings)}g</span>
                                <span className="text-xs text-carbs/70">C {Math.round(item.carbs * item.servings)}g</span>
                                <span className="text-xs text-fat/70">F {Math.round(item.fat * item.servings)}g</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingId(item.id);
                                  setDraft(toEditDraft(item));
                                  setActionMessage(null);
                                }}
                                className="rounded-lg border border-border-subtle px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800/50"
                              >
                                Edit
                              </button>
                              {confirmDelete === item.id ? (
                                <button
                                  type="button"
                                  aria-label={`Confirm delete ${item.food_name}`}
                                  onClick={() => { setConfirmDelete(undefined); if (item.id) void handleDeleteEntry(item.id); }}
                                  disabled={deleting === item.id}
                                  className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-60"
                                >
                                  {deleting === item.id ? "Deleting..." : "Confirm?"}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  aria-label={`Delete ${item.food_name}`}
                                  onClick={() => item.id && setConfirmDelete(item.id)}
                                  className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </div>

                          {editing && draft && (
                            <div className="grid gap-3 border-t border-border-subtle bg-surface-raised/40 px-5 py-4 md:grid-cols-2">
                              <label className="space-y-1">
                                <span className="text-xs text-zinc-400">Food name</span>
                                <input
                                  type="text"
                                  value={draft.food_name}
                                  onChange={(event) => setDraft((current) => current ? { ...current, food_name: event.target.value } : current)}
                                  className="w-full rounded-xl bg-zinc-800/60 border border-border-subtle px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-zinc-400">Brand</span>
                                <input
                                  type="text"
                                  value={draft.brand}
                                  onChange={(event) => setDraft((current) => current ? { ...current, brand: event.target.value } : current)}
                                  className="w-full rounded-xl bg-zinc-800/60 border border-border-subtle px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-zinc-400">Servings</span>
                                <input
                                  type="number"
                                  min={0.25}
                                  step={0.25}
                                  value={draft.servings}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current ? { ...current, servings: Number(event.target.value) } : current,
                                    )
                                  }
                                  className="w-full rounded-xl bg-zinc-800/60 border border-border-subtle px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs text-zinc-400">Serving size</span>
                                <input
                                  type="text"
                                  value={draft.serving_size}
                                  onChange={(event) =>
                                    setDraft((current) =>
                                      current ? { ...current, serving_size: event.target.value } : current,
                                    )
                                  }
                                  className="w-full rounded-xl bg-zinc-800/60 border border-border-subtle px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
                                />
                              </label>
                              <div className="md:col-span-2 border-t border-border-subtle pt-3 mt-1">
                                <p className="text-xs text-zinc-500 mb-2">Nutrition (per serving)</p>
                                <div className="grid gap-3 md:grid-cols-4">
                                  {([
                                    { key: "calories", label: "Calories", unit: "kcal" },
                                    { key: "protein", label: "Protein", unit: "g" },
                                    { key: "carbs", label: "Carbs", unit: "g" },
                                    { key: "fat", label: "Fat", unit: "g" },
                                  ] as const).map((field) => (
                                    <label key={field.key} className="space-y-1">
                                      <span className="text-xs text-zinc-400">{field.label} ({field.unit})</span>
                                      <input
                                        type="number"
                                        min={0}
                                        step={0.1}
                                        value={draft[field.key]}
                                        onChange={(event) =>
                                          setDraft((current) =>
                                            current ? { ...current, [field.key]: Number(event.target.value) } : current,
                                          )
                                        }
                                        className="w-full rounded-xl bg-zinc-800/60 border border-border-subtle px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-zinc-600"
                                      />
                                    </label>
                                  ))}
                                </div>
                              </div>
                              <div className="md:col-span-2 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => void saveEdit()}
                                  disabled={savingId === item.id}
                                  className="rounded-xl bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-60"
                                >
                                  {savingId === item.id ? "Saving..." : "Save changes"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingId(undefined);
                                    setDraft(null);
                                  }}
                                  className="rounded-xl border border-border-subtle px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {group.items.length > 0 && (
                  <div className="flex items-center gap-4 px-5 py-2.5 bg-surface-raised/50 border-t border-border-subtle text-xs font-mono text-zinc-500">
                    <span className="text-protein/60">P {Math.round(groupProtein)}g</span>
                    <span className="text-carbs/60">C {Math.round(groupCarbs)}g</span>
                    <span className="text-fat/60">F {Math.round(groupFat)}g</span>
                  </div>
                )}

                <a
                  href={`${base}log?date=${date}&meal=${group.type}`}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/30 transition-colors border-t border-border-subtle"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Add food to {group.label}
                </a>
              </div>
            );
          })}

          <div className="rounded-2xl bg-surface border border-border-subtle p-5">
            <h3 className="text-sm font-medium text-zinc-400 mb-3">Daily Totals</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-zinc-100 font-mono">{Math.round(totals.calories)}</p>
                <p className="text-xs text-zinc-500 mt-0.5">kcal {goals ? `/ ${goals.daily_calories}` : ""}</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-protein font-mono">{Math.round(totals.protein)}g</p>
                <p className="text-xs text-zinc-500 mt-0.5">protein</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-carbs font-mono">{Math.round(totals.carbs)}g</p>
                <p className="text-xs text-zinc-500 mt-0.5">carbs</p>
              </div>
              <div>
                <p className="text-2xl font-semibold tracking-tight text-fat font-mono">{Math.round(totals.fat)}g</p>
                <p className="text-xs text-zinc-500 mt-0.5">fat</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}