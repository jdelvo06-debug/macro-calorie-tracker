import { describe, expect, it } from "vitest";

import {
  ValidationError,
  mergeFoodLogUpdate,
  parseFoodLogCreateInput,
  parseFoodLogListDate,
  parseFoodLogUpdateInput,
  parseGoalsInput,
  parsePositiveId,
  parseWeightDays,
  parseWeightInput,
} from "./validation";

describe("validation", () => {
  it("accepts a valid food log create payload", () => {
    const parsed = parseFoodLogCreateInput({
      date: "2026-04-11",
      meal_type: "lunch",
      food_name: "Greek Yogurt",
      servings: 1.5,
      calories: 180,
      protein: 15,
      carbs: 12,
      fat: 4,
      fiber: 0,
      sugar: 9,
      sodium: 60,
    });

    expect(parsed.meal_type).toBe("lunch");
    expect(parsed.fiber).toBe(0);
  });

  it("rejects invalid meal types", () => {
    expect(() =>
      parseFoodLogCreateInput({
        meal_type: "dessert",
        food_name: "Cake",
      }),
    ).toThrowError(ValidationError);
  });

  it("rejects empty food names", () => {
    expect(() =>
      parseFoodLogCreateInput({
        meal_type: "snack",
        food_name: "   ",
      }),
    ).toThrowError("Food name is required.");
  });

  it("accepts a constrained food log update payload", () => {
    const parsed = parseFoodLogUpdateInput({
      id: 7,
      date: "2026-04-11",
      meal_type: "dinner",
      servings: 2,
    });

    expect(parsed.id).toBe(7);
    expect(parsed.meal_type).toBe("dinner");
  });

  it("allows nullable updates to clear optional food-log fields", () => {
    const merged = mergeFoodLogUpdate(
      {
        id: 1,
        date: "2026-04-11",
        meal_type: "dinner",
        food_name: "Chicken",
        brand: "Brand",
        serving_size: "1 bowl",
        servings: 1,
        calories: 400,
        protein: 30,
        carbs: 20,
        fat: 15,
        fiber: 2,
        sugar: 1,
        sodium: 250,
        vitamins: null,
        barcode: null,
        created_at: "2026-04-11T12:00:00",
      },
      parseFoodLogUpdateInput({
        id: 1,
        brand: null,
        serving_size: null,
      }),
    );

    expect(merged.brand).toBeNull();
    expect(merged.serving_size).toBeNull();
  });

  it("rejects invalid macro splits", () => {
    expect(() =>
      parseGoalsInput({
        daily_calories: 2200,
        protein_pct: 40,
        carbs_pct: 40,
        fat_pct: 30,
      }),
    ).toThrowError("Macro percentages must add up to 100.");
  });

  it("accepts valid goal settings", () => {
    const parsed = parseGoalsInput({
      daily_calories: 2200,
      protein_pct: 30,
      carbs_pct: 40,
      fat_pct: 30,
      goal_weight: 72.4,
    });

    expect(parsed.goal_weight).toBe(72.4);
  });

  it("validates weight payloads and query params", () => {
    expect(parseWeightInput({ date: "2026-04-11", weight: 81.2 })).toEqual({
      date: "2026-04-11",
      weight: 81.2,
    });
    expect(parseWeightDays("90")).toBe(90);
    expect(parseFoodLogListDate("2026-04-11")).toBe("2026-04-11");
    expect(parsePositiveId("42")).toBe(42);
  });

  it("rejects invalid ids, days, and weights", () => {
    expect(() => parsePositiveId("0")).toThrowError("A valid id is required.");
    expect(() => parseWeightDays("365")).toThrowError("Days must be 30 or 90.");
    expect(() => parseWeightInput({ date: "2026-04-11", weight: -5 })).toThrowError(
      "Weight must be between 1 and 500.",
    );
  });
});
