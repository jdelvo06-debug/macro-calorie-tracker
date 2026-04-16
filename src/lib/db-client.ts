/**
 * Client-side IndexedDB storage for the PWA.
 * Replaces server-side SQLite — all data lives in the browser.
 */

const DB_NAME = "macro-tracker";
const DB_VERSION = 1;

const STORES = {
  foodLogs: "food_logs",
  weightEntries: "weight_entries",
  goals: "goals",
} as const;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORES.foodLogs)) {
        const store = db.createObjectStore(STORES.foodLogs, { keyPath: "id", autoIncrement: true });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("meal_type", "meal_type", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.weightEntries)) {
        const store = db.createObjectStore(STORES.weightEntries, { keyPath: "id", autoIncrement: true });
        store.createIndex("date", "date", { unique: true });
      }

      if (!db.objectStoreNames.contains(STORES.goals)) {
        db.createObjectStore(STORES.goals, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        const request = fn(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

// ─── Food Logs ──────────────────────────────────────────────

export async function getFoodLogs(date: string) {
  const db = await openDB();
  return new Promise<FoodLogEntry[]>((resolve, reject) => {
    const transaction = db.transaction(STORES.foodLogs, "readonly");
    const store = transaction.objectStore(STORES.foodLogs);
    const index = store.index("date");
    const request = index.getAll(date);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addFoodLog(entry: Omit<FoodLogEntry, "id" | "created_at">) {
  const record = { ...entry, created_at: new Date().toISOString() };
  return tx(STORES.foodLogs, "readwrite", (store) => store.add(record)) as Promise<number>;
}

export async function updateFoodLog(entry: FoodLogEntry) {
  return tx(STORES.foodLogs, "readwrite", (store) => store.put(entry)) as Promise<IDBValidKey>;
}

export async function deleteFoodLog(id: number) {
  return tx(STORES.foodLogs, "readwrite", (store) => store.delete(id)) as Promise<undefined>;
}

export async function getFoodLogById(id: number) {
  return tx(STORES.foodLogs, "readonly", (store) => store.get(id)) as Promise<FoodLogEntry | undefined>;
}

// ─── Weight Entries ─────────────────────────────────────────

export async function getWeightEntries(days: number): Promise<WeightEntryRow[]> {
  const db = await openDB();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.weightEntries, "readonly");
    const store = transaction.objectStore(STORES.weightEntries);
    const index = store.index("date");
    const range = IDBKeyRange.lowerBound(cutoffStr);
    const request = index.getAll(range);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addWeightEntry(date: string, weight: number) {
  const entry = { date, weight, created_at: new Date().toISOString() };
  return tx(STORES.weightEntries, "readwrite", (store) => store.put(entry)) as Promise<IDBValidKey>;
}

export async function deleteWeightEntry(id: number) {
  return tx(STORES.weightEntries, "readwrite", (store) => store.delete(id)) as Promise<undefined>;
}

// ─── Goals ──────────────────────────────────────────────────

const DEFAULT_GOALS: GoalsRow = {
  id: 1,
  daily_calories: 2000,
  protein_pct: 30,
  carbs_pct: 40,
  fat_pct: 30,
  goal_weight: null,
  updated_at: new Date().toISOString(),
};

export async function getGoals(): Promise<GoalsRow> {
  const result = await tx(STORES.goals, "readonly", (store) => store.get(1)) as Promise<GoalsRow | undefined>;
  return result ?? { ...DEFAULT_GOALS };
}

export async function updateGoals(goals: Partial<GoalsRow>): Promise<GoalsRow> {
  const current = await getGoals();
  const updated = { ...current, ...goals, updated_at: new Date().toISOString() };
  await tx(STORES.goals, "readwrite", (store) => store.put(updated));
  return updated;
}

// ─── Types ──────────────────────────────────────────────────

export interface FoodLogEntry {
  id?: number;
  date: string;
  meal_type: "breakfast" | "lunch" | "dinner" | "snack";
  food_name: string;
  brand: string | null;
  serving_size: string | null;
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
  created_at: string;
}

export interface WeightEntryRow {
  id?: number;
  date: string;
  weight: number;
  created_at: string;
}

export interface GoalsRow {
  id: number;
  daily_calories: number;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
  goal_weight: number | null;
  updated_at: string;
}