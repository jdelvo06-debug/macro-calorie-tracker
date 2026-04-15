import type { MealType } from "./types";

// USDA FoodData Central nutrient IDs
const NUTRIENT_IDS = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093,
};

interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: Array<{ nutrientId: number; value: number }>;
}

export interface UsdaSearchResult {
  code: string;
  product_name: string;
  brands?: string;
  serving_size?: string;
  nutriments: Record<string, number | undefined>;
  image_small_url?: string;
  source: "USDA";
}

function getNutrient(nutrients: Array<{ nutrientId: number; value: number }>, id: number): number {
  return nutrients.find((n) => n.nutrientId === id)?.value ?? 0;
}

function normalizeUsdaFood(food: UsdaFood): UsdaSearchResult {
  const brand = food.brandName || food.brandOwner;
  const servingLabel =
    food.servingSize && food.servingSizeUnit
      ? `${food.servingSize}${food.servingSizeUnit}`
      : "100g";

  const calories = getNutrient(food.foodNutrients, NUTRIENT_IDS.calories);
  const protein = getNutrient(food.foodNutrients, NUTRIENT_IDS.protein);
  const carbs = getNutrient(food.foodNutrients, NUTRIENT_IDS.carbs);
  const fat = getNutrient(food.foodNutrients, NUTRIENT_IDS.fat);
  const fiber = getNutrient(food.foodNutrients, NUTRIENT_IDS.fiber);
  const sugar = getNutrient(food.foodNutrients, NUTRIENT_IDS.sugar);
  const sodium = getNutrient(food.foodNutrients, NUTRIENT_IDS.sodium);

  return {
    code: `usda-${food.fdcId}`,
    product_name: food.description,
    brands: brand,
    serving_size: servingLabel,
    nutriments: {
      "energy-kcal_serving": calories,
      "energy-kcal_100g": calories,
      proteins_serving: protein,
      proteins_100g: protein,
      carbohydrates_serving: carbs,
      carbohydrates_100g: carbs,
      fat_serving: fat,
      fat_100g: fat,
      fiber_serving: fiber,
      fiber_100g: fiber,
      sugars_serving: sugar,
      sugars_100g: sugar,
      sodium_serving: sodium,
      sodium_100g: sodium,
    },
    source: "USDA",
  };
}

export async function searchUSDA(query: string): Promise<UsdaSearchResult[]> {
  if (!query.trim()) return [];

  const apiKey = import.meta.env.USDA_FDC_API_KEY;
  if (!apiKey) {
    console.warn("USDA_FDC_API_KEY not set — skipping USDA search");
    return [];
  }

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("api_key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`USDA FDC request failed with ${response.status}`);
    }

    const payload = (await response.json()) as { foods?: UsdaFood[] };
    return (payload.foods ?? [])
      .filter((f) => f.foodNutrients?.length > 0)
      .map(normalizeUsdaFood);
  } catch (error) {
    clearTimeout(timeout);
    console.error("USDA FDC search error:", error);
    return [];
  }
}
