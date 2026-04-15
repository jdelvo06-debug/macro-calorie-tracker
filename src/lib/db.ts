import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const tursoUrl = import.meta.env.TURSO_DATABASE_URL?.trim();
const requestedMode = import.meta.env.DB_MODE?.trim() || "local";

if (requestedMode === "turso" && !tursoUrl) {
  throw new Error("DB_MODE=turso requires TURSO_DATABASE_URL to be set.");
}

if (requestedMode === "turso" && !import.meta.env.TURSO_AUTH_TOKEN?.trim()) {
  throw new Error("DB_MODE=turso requires TURSO_AUTH_TOKEN to be set.");
}

if (requestedMode !== "turso" && requestedMode !== "local") {
  throw new Error("DB_MODE must be either 'local' or 'turso'.");
}

const dbPath = requestedMode === "turso" ? tursoUrl! : "file:./data/local.db";
const authToken = requestedMode === "turso" ? import.meta.env.TURSO_AUTH_TOKEN || undefined : undefined;

export const databaseMode = requestedMode;

// Raw libsql client — used by API routes for raw SQL queries
export const db = createClient({
  url: dbPath,
  authToken,
});

// Drizzle ORM instance — for typed queries (future use)
export const orm = drizzle(db, { schema });

let initialized = false;

export async function ensureDB() {
  if (initialized) return;
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS food_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal_type TEXT NOT NULL CHECK(meal_type IN ('breakfast','lunch','dinner','snack')),
        food_name TEXT NOT NULL,
        brand TEXT,
        serving_size TEXT,
        servings REAL NOT NULL DEFAULT 1,
        calories REAL NOT NULL DEFAULT 0,
        protein REAL NOT NULL DEFAULT 0,
        carbs REAL NOT NULL DEFAULT 0,
        fat REAL NOT NULL DEFAULT 0,
        fiber REAL,
        sugar REAL,
        sodium REAL,
        vitamins TEXT,
        barcode TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS weight_entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL UNIQUE,
        weight REAL NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY CHECK(id = 1),
        daily_calories INTEGER NOT NULL DEFAULT 2000,
        protein_pct INTEGER NOT NULL DEFAULT 30,
        carbs_pct INTEGER NOT NULL DEFAULT 40,
        fat_pct INTEGER NOT NULL DEFAULT 30,
        goal_weight REAL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
    {
      sql: `INSERT OR IGNORE INTO goals (id, daily_calories, protein_pct, carbs_pct, fat_pct) VALUES (1, 2000, 30, 40, 30)`,
      args: [],
    },
  ]);
  initialized = true;
}