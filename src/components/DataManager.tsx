import { useState } from "react";
import { getFoodLogs, addFoodLog, getWeightEntries, addWeightEntry, getGoals, updateGoals } from "../lib/db-client";

export default function DataManager() {
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);

  async function handleExport() {
    setExporting(true);
    setMessage(null);
    try {
      // Get all data from IndexedDB
      const db = await openDB();
      const foodLogs = await getAllFromStore(db, "food_logs");
      const weightEntries = await getAllFromStore(db, "weight_entries");
      const goals = await getAllFromStore(db, "goals");

      const exportData = {
        version: 1,
        exported_at: new Date().toISOString(),
        food_log: foodLogs,
        weight_entries: weightEntries,
        goals: goals,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `macro-tracker-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setMessage({ text: `Exported ${foodLogs.length} food logs, ${weightEntries.length} weight entries.`, isError: false });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Export failed.", isError: true });
    } finally {
      setExporting(false);
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setMessage(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.version || !data.food_log) {
        throw new Error("Invalid export file. Missing version or food_log data.");
      }

      let foodCount = 0;
      let weightCount = 0;

      // Import food logs (skip existing by creating new entries)
      for (const entry of data.food_log) {
        const { id, created_at, ...rest } = entry;
        await addFoodLog(rest);
        foodCount++;
      }

      // Import weight entries
      if (data.weight_entries) {
        for (const entry of data.weight_entries) {
          const { id, created_at, ...rest } = entry;
          await addWeightEntry(rest.date, rest.weight);
          weightCount++;
        }
      }

      // Import goals (overwrite)
      if (data.goals && data.goals.length > 0) {
        const { id, updated_at, ...rest } = data.goals[0];
        await updateGoals(rest);
      }

      setMessage({ text: `Imported ${foodCount} food logs, ${weightCount} weight entries.`, isError: false });
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Import failed.", isError: true });
    } finally {
      setImporting(false);
      // Reset the file input
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 disabled:opacity-60"
        >
          {exporting ? "Exporting..." : "📥 Export Data"}
        </button>

        <label className="px-4 py-2.5 rounded-xl text-sm font-medium transition-all active:scale-[0.98] bg-zinc-800/50 text-zinc-300 hover:bg-zinc-700 border border-border-subtle cursor-pointer disabled:opacity-60">
          {importing ? "Importing..." : "📤 Import Data"}
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={importing}
            className="hidden"
          />
        </label>
      </div>

      {message && (
        <div className={`rounded-xl px-4 py-3 text-sm ${message.isError ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {message.text}
        </div>
      )}

      <p className="text-xs text-zinc-500">
        Export saves all your data as a JSON file. Import merges data from a previously exported file.
      </p>
    </div>
  );
}

// ─── IndexedDB helpers (direct access for export) ─────────

const DB_NAME = "macro-tracker";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function getAllFromStore(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}