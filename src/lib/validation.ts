import { z } from "zod";

import type { FoodLog } from "./types";
import type { MealType } from "./types";
import { isDateKey, toDateKey } from "./date";

const mealTypeSchema = z.enum(["breakfast", "lunch", "dinner", "snack"]);
const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format.")
  .refine(isDateKey, "Date is not a valid calendar date.");
const nullableTrimmedString = z.preprocess(
  (value) => {
    if (value == null) return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
  },
  z.string().nullable(),
);
const nutritionNumberSchema = z
  .number()
  .refine(Number.isFinite, "Value must be a finite number.")
  .min(0, "Nutrition values must be zero or greater.")
  .max(100000, "Nutrition values are unrealistically large.");

const foodLogBaseSchema = z.object({
  date: dateKeySchema.optional().default(toDateKey()),
  meal_type: mealTypeSchema,
  food_name: z
    .string()
    .trim()
    .min(1, "Food name is required.")
    .max(200, "Food name is too long."),
  brand: nullableTrimmedString.optional().default(null),
  serving_size: nullableTrimmedString.optional().default(null),
  servings: z.number().refine(Number.isFinite, "Value must be a finite number.").gt(0, "Servings must be greater than 0.").max(100).default(1),
  calories: nutritionNumberSchema.default(0),
  protein: nutritionNumberSchema.default(0),
  carbs: nutritionNumberSchema.default(0),
  fat: nutritionNumberSchema.default(0),
  fiber: nutritionNumberSchema.nullable().optional().default(null),
  sugar: nutritionNumberSchema.nullable().optional().default(null),
  sodium: nutritionNumberSchema.nullable().optional().default(null),
  vitamins: nullableTrimmedString.optional().default(null),
  barcode: nullableTrimmedString.optional().default(null),
});

const foodLogUpdateSchema = foodLogBaseSchema.partial().extend({
  id: z.number().int().positive("A valid id is required."),
});

const goalsSchema = z
  .object({
    daily_calories: z.number().int().min(500).max(10000),
    protein_pct: z.number().int().min(0).max(100),
    carbs_pct: z.number().int().min(0).max(100),
    fat_pct: z.number().int().min(0).max(100),
    goal_weight: z.number().refine(Number.isFinite, "Value must be a finite number.").min(1).max(500).nullable().optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.protein_pct + value.carbs_pct + value.fat_pct !== 100) {
      ctx.addIssue({
        code: "custom",
        message: "Macro percentages must add up to 100.",
      });
    }
  });

const weightSchema = z.object({
  date: dateKeySchema,
  weight: z.number().refine(Number.isFinite, "Value must be a finite number.").min(1, "Weight must be between 1 and 500.").max(500, "Weight must be between 1 and 500."),
});

export type FoodLogCreateInput = z.infer<typeof foodLogBaseSchema>;
export type FoodLogUpdateInput = z.infer<typeof foodLogUpdateSchema>;
export type GoalsInput = z.infer<typeof goalsSchema>;
export type WeightInput = z.infer<typeof weightSchema>;

export class ValidationError extends Error {
  readonly status = 400;

  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

function raiseParseError(result: z.ZodSafeParseError<unknown>): never {
  throw new ValidationError(result.error.issues[0]?.message ?? "Invalid request.");
}

export function parseFoodLogCreateInput(input: unknown): FoodLogCreateInput {
  const result = foodLogBaseSchema.safeParse(input);
  if (!result.success) {
    raiseParseError(result);
  }

  return result.data;
}

export function parseFoodLogUpdateInput(input: unknown): FoodLogUpdateInput {
  const result = foodLogUpdateSchema.safeParse(input);
  if (!result.success) {
    raiseParseError(result);
  }

  return result.data;
}

export function parseGoalsInput(input: unknown): GoalsInput {
  const result = goalsSchema.safeParse(input);
  if (!result.success) {
    raiseParseError(result);
  }

  return result.data;
}

export function parseWeightInput(input: unknown): WeightInput {
  const result = weightSchema.safeParse(input);
  if (!result.success) {
    raiseParseError(result);
  }

  return result.data;
}

export function parsePositiveId(input: string | null): number {
  const value = Number(input);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError("A valid id is required.");
  }

  return value;
}

export function parseWeightDays(input: string | null): 30 | 90 {
  const value = Number(input ?? 30);
  if (value !== 30 && value !== 90) {
    throw new ValidationError("Days must be 30 or 90.");
  }

  return value;
}

export function parseFoodLogListDate(input: string | null): string {
  if (input == null) {
    return toDateKey();
  }

  const result = dateKeySchema.safeParse(input);
  if (!result.success) {
    raiseParseError(result);
  }

  return result.data;
}

export function isMealType(value: string): value is MealType {
  return mealTypeSchema.safeParse(value).success;
}

export function mergeFoodLogUpdate(existing: FoodLog, update: FoodLogUpdateInput): FoodLogCreateInput {
  return {
    date: update.date ?? existing.date,
    meal_type: update.meal_type ?? existing.meal_type,
    food_name: update.food_name ?? existing.food_name,
    brand: update.brand === undefined ? existing.brand : update.brand,
    serving_size: update.serving_size === undefined ? existing.serving_size : update.serving_size,
    servings: update.servings ?? existing.servings,
    calories: update.calories ?? existing.calories,
    protein: update.protein ?? existing.protein,
    carbs: update.carbs ?? existing.carbs,
    fat: update.fat ?? existing.fat,
    fiber: update.fiber === undefined ? existing.fiber : update.fiber,
    sugar: update.sugar === undefined ? existing.sugar : update.sugar,
    sodium: update.sodium === undefined ? existing.sodium : update.sodium,
    vitamins: update.vitamins === undefined ? existing.vitamins : update.vitamins,
    barcode: update.barcode === undefined ? existing.barcode : update.barcode,
  };
}
