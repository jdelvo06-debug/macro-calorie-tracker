import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// Schema matches the existing food_logs table from ensureDB()
export const foodLogs = sqliteTable("food_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  mealType: text("meal_type").notNull(),
  foodName: text("food_name").notNull(),
  brand: text("brand"),
  servingSize: text("serving_size"),
  servings: real("servings").notNull().default(1),
  calories: real("calories").notNull().default(0),
  protein: real("protein").notNull().default(0),
  carbs: real("carbs").notNull().default(0),
  fat: real("fat").notNull().default(0),
  fiber: real("fiber"),
  sugar: real("sugar"),
  sodium: real("sodium"),
  vitamins: text("vitamins"),
  barcode: text("barcode"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const weightEntries = sqliteTable("weight_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull().unique(),
  weight: real("weight").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const goals = sqliteTable("goals", {
  id: integer("id").primaryKey(),
  dailyCalories: integer("daily_calories").notNull().default(2000),
  proteinPct: integer("protein_pct").notNull().default(30),
  carbsPct: integer("carbs_pct").notNull().default(40),
  fatPct: integer("fat_pct").notNull().default(30),
  goalWeight: real("goal_weight"),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});