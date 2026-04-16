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

// ─── Sync Helpers ───────────────────────────────────────────

function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/** Silently sync to Supabase — never throws, logs errors to console */
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

/** Pull all data from Supabase and merge into IndexedDB */
export async function syncFromCloud() {
  if (!isOnline()) return;

  try {
    // Food logs
    const { data: foodLogs, error: foodError } = await supabase
      .from("food_log")
      .select("*")
      .order("date", { ascending: true });

    if (foodError) {
      console.error("[sync] food_log fetch failed:", foodError.message);
    } else if (foodLogs) {
      const db = await openDB();
      const transaction = db.transaction(STORES.foodLogs, "readwrite");
      const store = transaction.objectStore(STORES.foodLogs);
      store.clear();
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
    }

    // Weight entries
    const { data: weightEntries, error: weightError } = await supabase
      .from("weight_entries")
      .select("*")
      .order("date", { ascending: true });

    if (weightError) {
      console.error("[sync] weight_entries fetch failed:", weightError.message);
    } else if (weightEntries) {
      const db = await openDB();
      const transaction = db.transaction(STORES.weightEntries, "readwrite");
      const store = transaction.objectStore(STORES.weightEntries);
      store.clear();
      for (const row of weightEntries) {
        store.put({
          id: row.id,
          date: row.date,
          weight: Number(row.weight),
          created_at: row.created_at,
        });
      }
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
      const db = await openDB();
      const transaction = db.transaction(STORES.goals, "readwrite");
      const store = transaction.objectStore(STORES.goals);
      store.put({
        id: goals.id,
        daily_calories: goals.daily_calories,
        protein_pct: goals.protein_pct,
        carbs_pct: goals.carbs_pct,
        fat_pct: goals.fat_pct,
        goal_weight: goals.goal_weight != null ? Number(goals.goal_weight) : null,
        updated_at: goals.created_at,
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

export async function addFoodLog(entry: Omit<FoodLogEntry, "id" | "created_at">) {
  const record = { ...entry, created_at: new Date().toISOString() };

  // Save to IndexedDB first
  const id = await tx(STORES.foodLogs, "readwrite", (store) => store.add(record)) as number;

  // Sync to Supabase
  void syncToCloud("food_log", { ...record, id });

  return id;
}

export async function updateFoodLog(entry: FoodLogEntry) {
  // IndexedDB
  await tx(STORES.foodLogs, "readwrite", (store) => store.put(entry));

  // Supabase
  void syncToCloud("food_log", { ...entry });
}

export async function deleteFoodLog(id: number) {
  // IndexedDB
  await tx(STORES.foodLogs, "readwrite", (store) => store.delete(id));

  // Supabase
  void deleteFromCloud("food_log", id);
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

  // Check if entry exists for this date (Supabase has UNIQUE on date)
  const existing = await getWeightEntryByDate(date);
  const id = existing?.id;

  // IndexedDB (put = upsert by key)
  const result = await tx(STORES.weightEntries, "readwrite", (store) => store.put(id ? { ...entry, id } : entry)) as IDBValidKey;

  // Supabase (upsert by date conflict)
  void syncToCloud("weight_entries", { ...entry, ...(id ? { id } : {}) });

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
  await tx(STORES.weightEntries, "readwrite", (store) => store.delete(id));
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
  const result = await tx(STORES.goals, "readonly", (store) => store.get(1)) as Promise<GoalsRow | undefined>;
  return result ?? { ...DEFAULT_GOALS };
}

export async function updateGoals(goals: Partial<GoalsRow>): Promise<GoalsRow> {
  const current = await getGoals();
  const updated = { ...current, ...goals, updated_at: new Date().toISOString() };
  await tx(STORES.goals, "readwrite", (store) => store.put(updated));

  // Supabase (id=1 always)
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