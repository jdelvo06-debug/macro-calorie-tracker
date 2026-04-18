import type { MealType } from "./types";

export interface SearchResult {
  code: string;
  product_name: string;
  brands?: string;
  serving_size?: string;
  nutriments: Record<string, number | undefined>;
  image_small_url?: string;
  source?: "USDA" | "OFF";
}

interface FoodLogContext {
  date: string;
  meal_type: MealType;
  servings: number;
}

interface NutritionOverride {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number | null;
  sugar?: number | null;
  sodium?: number | null;
  serving_size?: string;
  servings?: number;
}

export function getOpenFoodFactsNutrient(
  nutriments: Record<string, number | undefined>,
  servingKey: string,
  hundredGramKey: string,
): number {
  return nutriments[servingKey] ?? nutriments[hundredGramKey] ?? 0;
}

export function getOpenFoodFactsNullableNutrient(
  nutriments: Record<string, number | undefined>,
  servingKey: string,
  hundredGramKey: string,
): number | null {
  return nutriments[servingKey] ?? nutriments[hundredGramKey] ?? null;
}

export function getServingSize(product: SearchResult): string {
  return product.serving_size || "100g";
}

export function toFoodLogPayload(product: SearchResult, context: FoodLogContext, override?: NutritionOverride) {
  const nutriments = product.nutriments;

  return {
    date: context.date,
    meal_type: context.meal_type,
    food_name: product.product_name,
    brand: product.brands || null,
    serving_size: override?.serving_size ?? getServingSize(product),
    servings: override?.servings ?? context.servings,
    calories: override?.calories ?? getOpenFoodFactsNutrient(nutriments, "energy-kcal_serving", "energy-kcal_100g"),
    protein: override?.protein ?? getOpenFoodFactsNutrient(nutriments, "proteins_serving", "proteins_100g"),
    carbs: override?.carbs ?? getOpenFoodFactsNutrient(nutriments, "carbohydrates_serving", "carbohydrates_100g"),
    fat: override?.fat ?? getOpenFoodFactsNutrient(nutriments, "fat_serving", "fat_100g"),
    fiber: override?.fiber !== undefined ? override.fiber : getOpenFoodFactsNullableNutrient(nutriments, "fiber_serving", "fiber_100g"),
    sugar: override?.sugar !== undefined ? override.sugar : getOpenFoodFactsNullableNutrient(nutriments, "sugars_serving", "sugars_100g"),
    sodium: override?.sodium !== undefined ? override.sodium : getOpenFoodFactsNullableNutrient(nutriments, "sodium_serving", "sodium_100g"),
    vitamins: JSON.stringify({
      vitamin_a: nutriments["vitamin-a_100g"] ?? null,
      vitamin_c: nutriments["vitamin-c_100g"] ?? null,
      calcium: nutriments["calcium_100g"] ?? null,
      iron: nutriments["iron_100g"] ?? null,
      potassium: nutriments["potassium_100g"] ?? null,
    }),
    barcode: product.code,
  };
}
