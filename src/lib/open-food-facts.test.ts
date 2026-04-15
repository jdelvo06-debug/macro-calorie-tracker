import { describe, expect, it } from "vitest";

import { getOpenFoodFactsNutrient, toFoodLogPayload } from "./open-food-facts";

describe("open food facts helpers", () => {
  it("falls back per nutrient instead of assuming serving data exists for everything", () => {
    const nutriments = {
      "energy-kcal_serving": 210,
      proteins_100g: 11,
      carbohydrates_serving: 20,
      fat_100g: 6,
    };

    expect(getOpenFoodFactsNutrient(nutriments, "energy-kcal_serving", "energy-kcal_100g")).toBe(210);
    expect(getOpenFoodFactsNutrient(nutriments, "proteins_serving", "proteins_100g")).toBe(11);
    expect(getOpenFoodFactsNutrient(nutriments, "carbohydrates_serving", "carbohydrates_100g")).toBe(20);
    expect(getOpenFoodFactsNutrient(nutriments, "fat_serving", "fat_100g")).toBe(6);
  });

  it("builds a complete food-log payload with per-field fallback", () => {
    const payload = toFoodLogPayload(
      {
        code: "123",
        product_name: "Granola",
        serving_size: "50g",
        nutriments: {
          "energy-kcal_serving": 210,
          proteins_100g: 11,
          carbohydrates_serving: 20,
          fat_100g: 6,
          fiber_100g: 4,
        },
      },
      {
        date: "2026-04-11",
        meal_type: "breakfast",
        servings: 2,
      },
    );

    expect(payload.calories).toBe(210);
    expect(payload.protein).toBe(11);
    expect(payload.carbs).toBe(20);
    expect(payload.fat).toBe(6);
    expect(payload.fiber).toBe(4);
  });
});
