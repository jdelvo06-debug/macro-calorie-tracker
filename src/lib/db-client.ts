/**
 * Client-side storage with Supabase cloud sync.
 * IndexedDB for offline, Supabase for persistence and multi-device.
 */

import { supabase } from "./supabase";

// ─── IndexedDB Core ─────────────────────────────────────────

const DB_NAME = "macro-tracker";
const DB_VERSION = 1;

const STORES = {
  foodLogs: "food_logs",
  weightEntries: "weight_entries",
  goals: "goals",
} as const;

export function openDB(): Promise<IDBDatabase> {
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

function txPromise<T>(storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
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

/** Wait for a transaction to complete (not just a single request) */
function txComplete(db: IDBDatabase, storeName: string, mode: IDBTransactionMode, fn: (store: IDBObjectStore) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    fn(store);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export function getAllFromStore(db: IDBDatabase, storeName: string): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Sync Helpers ───────────────────────────────────────────

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

async function syncToCloud(table: string, data: Record<string, unknown>) {
  if (!isOnline()) return;
  try {
    const { error } = await supabase.from(table).upsert(data, { onConflict: "id" });
    if (error) console.error(`[sync] ${table} upsert failed:`, error.message);
  } catch (err) {
    console.error(`[sync] ${table} upsert exception:`, err);
  }
}

async function deleteFromCloud(table: string, id: number) {
  if (!isOnline()) return;
  try {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) console.error(`[sync] ${table} delete failed:`, error.message);
  } catch (err) {
    console.error(`[sync] ${table} delete exception:`, err);
  }
}

/**
 * Pull latest data from Supabase and merge into IndexedDB.
 * Uses atomic transactions per store so a mid-sync page close
 * doesn't leave a store empty — either all rows land or none.
 *
 * For each store, we fetch cloud data first, then write it
 * in a single IDB transaction so it's all-or-nothing per table.
 * Existing local-only entries (no cloud counterpart) are preserved
 * via put semantics (cloud rows overwrite matching IDs).
 */
export async function syncFromCloud() {
  if (!isOnline()) return;

  try {
    const db = await openDB();

    // Food logs
    const { data: foodLogs, error: foodError } = await supabase
      .from("food_log")
      .select("*")
      .order("date", { ascending: true });

    if (foodError) {
      console.error("[sync] food_log fetch failed:", foodError.message);
    } else if (foodLogs) {
      await txComplete(db, STORES.foodLogs, "readwrite", (store) => {
        for (const row of foodLogs) {
          store.put({
            id: row.id,
            date: row.date,
            meal_type: row.meal_type,
            food_name: row.food_name,
            brand: row.brand,
            serving_size: row.serving_size,
            servings: Number(row.servings),
            calories: Number(row.calories),
            protein: Number(row.protein),
            carbs: Number(row.carbs),
            fat: Number(row.fat),
            fiber: row.fiber != null ? Number(row.fiber) : null,
            sugar: row.sugar != null ? Number(row.sugar) : null,
            sodium: row.sodium != null ? Number(row.sodium) : null,
            vitamins: row.vitamins,
            barcode: row.barcode,
            created_at: row.created_at,
          });
        }
      });
    }

    // Weight entries
    const { data: weightEntries, error: weightError } = await supabase
      .from("weight_entries")
      .select("*")
      .order("date", { ascending: true });

    if (weightError) {
      console.error("[sync] weight_entries fetch failed:", weightError.message);
    } else if (weightEntries) {
      await txComplete(db, STORES.weightEntries, "readwrite", (store) => {
        for (const row of weightEntries) {
          store.put({
            id: row.id,
            date: row.date,
            weight: Number(row.weight),
            created_at: row.created_at,
          });
        }
      });
    }

    // Goals
    const { data: goals, error: goalsError } = await supabase
      .from("goals")
      .select("*")
      .eq("id", 1)
      .single();

    if (goalsError) {
      console.error("[sync] goals fetch failed:", goalsError.message);
    } else if (goals) {
      await txComplete(db, STORES.goals, "readwrite", (store) => {
        store.put({
          id: goals.id,
          daily_calories: goals.daily_calories,
          protein_pct: goals.protein_pct,
          carbs_pct: goals.carbs_pct,
          fat_pct: goals.fat_pct,
          goal_weight: goals.goal_weight != null ? Number(goals.goal_weight) : null,
          updated_at: goals.created_at,
        });
      });
    }

    console.log("[sync] Cloud → IndexedDB sync complete");
  } catch (err) {
    console.error("[sync] Full sync failed:", err);
  }
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

export async function getRecentFoods(limit = 20): Promise<FoodLogEntry[]> {
  const db = await openDB();
  const all = await new Promise<FoodLogEntry[]>((resolve, reject) => {
    const transaction = db.transaction(STORES.foodLogs, "readonly");
    const store = transaction.objectStore(STORES.foodLogs);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const seen = new Map<string, FoodLogEntry>();
  for (const entry of all) {
    const key = entry.food_name.toLowerCase().trim();
    const existing = seen.get(key);
    if (!existing || entry.created_at > existing.created_at) {
      seen.set(key, entry);
    }
  }

  return [...seen.values()]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

export async function addFoodLog(entry: Omit<FoodLogEntry, "id" | "created_at">) {
  const record = { ...entry, created_at: new Date().toISOString() };

  const id = await txPromise(STORES.foodLogs, "readwrite", (store) => store.add(record)) as number;

  void syncToCloud("food_log", { ...record, id });

  return id;
}

export async function updateFoodLog(entry: FoodLogEntry) {
  await txPromise(STORES.foodLogs, "readwrite", (store) => store.put(entry));

  void syncToCloud("food_log", { ...entry });
}

export async function deleteFoodLog(id: number) {
  await txPromise(STORES.foodLogs, "readwrite", (store) => store.delete(id));

  void deleteFromCloud("food_log", id);
}

export async function getFoodLogById(id: number) {
  return txPromise(STORES.foodLogs, "readonly", (store) => store.get(id)) as Promise<FoodLogEntry | undefined>;
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

  // Use put with the date index to upsert atomically
  // (the date index has unique:true, so duplicate dates are prevented)
  const existing = await getWeightEntryByDate(date);
  const record = existing
    ? { ...entry, id: existing.id }
    : entry;

  const result = await txPromise(STORES.weightEntries, "readwrite", (store) => store.put(record)) as IDBValidKey;

  void syncToCloud("weight_entries", { ...record });

  return result;
}

async function getWeightEntryByDate(date: string): Promise<WeightEntryRow | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.weightEntries, "readonly");
    const store = transaction.objectStore(STORES.weightEntries);
    const index = store.index("date");
    const request = index.get(date);
    request.onsuccess = () => resolve(request.result ?? undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteWeightEntry(id: number) {
  await txPromise(STORES.weightEntries, "readwrite", (store) => store.delete(id));
  void deleteFromCloud("weight_entries", id);
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
  const raw = await txPromise(STORES.goals, "readonly", (store) => store.get(1));
  const result = (raw as GoalsRow | undefined) ?? undefined;
  if (result) return result;
  return { ...DEFAULT_GOALS };
}

export async function updateGoals(goals: Partial<GoalsRow>): Promise<GoalsRow> {
  const current = await getGoals();
  const updated = { ...current, ...goals, updated_at: new Date().toISOString() };
  await txPromise(STORES.goals, "readwrite", (store) => store.put(updated));

  void syncToCloud("goals", {
    id: 1,
    daily_calories: updated.daily_calories,
    protein_pct: updated.protein_pct,
    carbs_pct: updated.carbs_pct,
    fat_pct: updated.fat_pct,
    goal_weight: updated.goal_weight,
  });

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