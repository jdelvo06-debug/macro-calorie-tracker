import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";

import { apiRequest, messageFromError } from "../lib/api";
import { parseDateKey, toDateKey } from "../lib/date";
import type { Goals, WeightEntry } from "../lib/types";

Chart.register(...registerables);

export default function WeightTracker() {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [goals, setGoals] = useState<Goals | null>(null);
  const [loading, setLoading] = useState(true);
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(toDateKey());
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [range, setRange] = useState<30 | 90>(30);
  const [error, setError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstance = useRef<Chart | null>(null);

  async function loadData(days: 30 | 90) {
    setLoading(true);
    setError(null);

    try {
      const [entriesData, goalsData] = await Promise.all([
        apiRequest<WeightEntry[]>(`/api/weight?days=${days}`),
        apiRequest<Goals>("/api/goals"),
      ]);
      setEntries(entriesData);
      setGoals(goalsData);
    } catch (nextError) {
      setError(messageFromError(nextError));
      setEntries([]);
      setGoals(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData(range);
  }, [range]);

  useEffect(() => {
    if (!chartRef.current) {
      return;
    }

    chartInstance.current?.destroy();
    chartInstance.current = null;

    if (entries.length === 0) {
      return;
    }

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) {
      return;
    }

    const labels = entries.map((entry) =>
      parseDateKey(entry.date)?.toLocaleDateString("en-US", { month: "short", day: "numeric" }) ?? entry.date,
    );
    const data = entries.map((entry) => entry.weight);
    const goalWeight = goals?.goal_weight;

    chartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Weight",
            data,
            borderColor: "#10b981",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointBackgroundColor: "#10b981",
            pointBorderColor: "#18181b",
            pointBorderWidth: 2,
            pointHoverRadius: 6,
          },
          ...(goalWeight
            ? [
                {
                  label: "Goal",
                  data: new Array(labels.length).fill(goalWeight),
                  borderColor: "#3b82f6",
                  borderDash: [6, 4],
                  borderWidth: 1.5,
                  pointRadius: 0,
                  fill: false,
                },
              ]
            : []),
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "#27272a",
            titleColor: "#a1a1aa",
            bodyColor: "#e4e4e7",
            borderColor: "#3f3f46",
            borderWidth: 1,
            cornerRadius: 8,
            padding: 10,
            bodyFont: { family: "JetBrains Mono, monospace" },
          },
        },
        scales: {
          x: {
            grid: { color: "rgba(63, 63, 70, 0.3)" },
            ticks: { color: "#71717a", font: { size: 11 } },
          },
          y: {
            grid: { color: "rgba(63, 63, 70, 0.3)" },
            ticks: { color: "#71717a", font: { size: 11 } },
          },
        },
      },
    });

    return () => {
      chartInstance.current?.destroy();
      chartInstance.current = null;
    };
  }, [entries, goals]);

  async function logWeight() {
    if (!weight) {
      return;
    }

    setSaving(true);
    setActionMessage(null);

    try {
      await apiRequest("/api/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, weight: parseFloat(weight) }),
      });
      setWeight("");
      setDate(toDateKey());
      setActionMessage({ text: "Weight entry saved.", isError: false });
      await loadData(range);
    } catch (nextError) {
      setActionMessage({ text: messageFromError(nextError), isError: true });
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(id: number) {
    setDeletingId(id);
    setActionMessage(null);

    try {
      await apiRequest(`/api/weight?id=${id}`, { method: "DELETE" });
      setEntries((current) => current.filter((entry) => entry.id !== id));
      setActionMessage({ text: "Weight entry deleted.", isError: false });
    } catch (nextError) {
      setActionMessage({ text: messageFromError(nextError), isError: true });
    } finally {
      setDeletingId(null);
    }
  }

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const oldest = entries.length > 1 ? entries[0] : null;
  const change = latest && oldest ? latest.weight - oldest.weight : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Weight Tracker</h1>
        <p className="text-sm text-zinc-500 mt-1">Track your progress over time</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className={`rounded-xl px-4 py-3 text-sm ${actionMessage.isError ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {actionMessage.text}
        </div>
      )}

      <div className="rounded-2xl bg-surface border border-border-subtle p-5">
        <h2 className="text-sm font-medium text-zinc-400 mb-4">Log Weight</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="sm:w-52">
            <span className="sr-only">Entry date</span>
            <input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-800/50 border border-border-subtle text-zinc-200 text-sm focus:outline-none focus:border-zinc-600"
            />
          </label>
          <label className="relative flex-1">
            <span className="sr-only">Weight in pounds</span>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="Weight"
              className="w-full px-4 py-2.5 pr-12 rounded-xl bg-zinc-800/50 border border-border-subtle text-zinc-200 text-sm placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-zinc-500">lbs</span>
          </label>
          <button
            type="button"
            onClick={() => void logWeight()}
            disabled={saving || !weight}
            className="px-6 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-sm font-medium hover:bg-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {saving ? "Saving..." : "Log"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-zinc-800/50 animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {latest && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-xl bg-surface border border-border-subtle p-4">
                <p className="text-xs text-zinc-500 mb-1">Current</p>
                <p className="text-xl font-semibold tracking-tight font-mono text-zinc-100">{latest.weight} lbs</p>
              </div>
              {goals?.goal_weight != null && (
                <div className="rounded-xl bg-surface border border-border-subtle p-4">
                  <p className="text-xs text-zinc-500 mb-1">Goal</p>
                  <p className="text-xl font-semibold tracking-tight font-mono text-blue-400">{goals.goal_weight} lbs</p>
                </div>
              )}
              {change !== null && (
                <div className="rounded-xl bg-surface border border-border-subtle p-4">
                  <p className="text-xs text-zinc-500 mb-1">Change ({range}d)</p>
                  <p className={`text-xl font-semibold tracking-tight font-mono ${change < 0 ? "text-emerald-400" : change > 0 ? "text-red-400" : "text-zinc-400"}`}>
                    {change > 0 ? "+" : ""}
                    {change.toFixed(1)} lbs
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {([30, 90] as const).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRange(value)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  range === value ? "bg-zinc-800 text-zinc-200 border border-zinc-700" : "text-zinc-500 hover:text-zinc-300 border border-transparent"
                }`}
              >
                {value} days
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-surface border border-border-subtle p-5">
            {entries.length === 0 ? (
              <div className="h-64 flex items-center justify-center">
                <p className="text-sm text-zinc-600">No weight entries yet. Log your first entry above.</p>
              </div>
            ) : (
              <div className="h-64 sm:h-80">
                <canvas ref={chartRef} />
              </div>
            )}
          </div>

          {entries.length > 0 && (
            <div className="rounded-2xl bg-surface border border-border-subtle overflow-hidden">
              <div className="px-5 py-3 bg-surface-raised">
                <h2 className="text-sm font-medium text-zinc-300">Recent Entries</h2>
              </div>
              <div className="divide-y divide-border-subtle max-h-64 overflow-y-auto">
                {[...entries].reverse().map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <span className="text-sm text-zinc-300 font-mono">{entry.weight} lbs</span>
                      <span className="text-xs text-zinc-600 ml-3">
                        {parseDateKey(entry.date)?.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        }) ?? entry.date}
                      </span>
                    </div>
                    {confirmDeleteId === entry.id ? (
                      <button
                        type="button"
                        aria-label={`Confirm delete weight entry from ${entry.date}`}
                        onClick={() => { setConfirmDeleteId(null); void deleteEntry(entry.id); }}
                        disabled={deletingId === entry.id}
                        className="rounded-lg bg-red-500/20 border border-red-500/30 px-3 py-2 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-60"
                      >
                        {deletingId === entry.id ? "Deleting..." : "Confirm?"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        aria-label={`Delete weight entry from ${entry.date}`}
                        onClick={() => setConfirmDeleteId(entry.id)}
                        className="rounded-lg border border-red-500/20 px-3 py-2 text-xs text-red-300 hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
