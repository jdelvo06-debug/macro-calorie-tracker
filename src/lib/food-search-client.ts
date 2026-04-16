/**
 * Client-side food search — calls USDA and OFF APIs directly from the browser.
 * Replaces the server-side /api/food-search route.
 */

import { type SearchResult } from "./open-food-facts";

const USDA_API_KEY = "uMpM168GlNeOwaF2eVUxKHKftZ7NmFjoU6JF4cLG";

// ─── Open Food Facts (direct browser call) ──────────────────

async function searchOpenFoodFacts(query: string): Promise<SearchResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,serving_size,nutriments,image_small_url`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`OFF failed: ${response.status}`);
    const data = await response.json();
    return (data.products || []).filter((p: SearchResult) => p.product_name && p.nutriments);
  } catch {
    return [];
  }
}

// ─── USDA FoodData Central (direct browser call) ────────────

interface UsdaFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: Array<{ nutrientId: number; value: number }>;
}

const NUTRIENT_IDS = {
  calories: 1008,
  protein: 1003,
  carbs: 1005,
  fat: 1004,
  fiber: 1079,
  sugar: 2000,
  sodium: 1093,
};

function getNutrient(nutrients: Array<{ nutrientId: number; value: number }>, id: number): number {
  return nutrients.find((n) => n.nutrientId === id)?.value ?? 0;
}

function normalizeUsdaFood(food: UsdaFood): SearchResult {
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

async function searchUSDA(query: string): Promise<SearchResult[]> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", "10");
  url.searchParams.set("dataType", "Foundation,SR Legacy");
  url.searchParams.set("api_key", USDA_API_KEY);

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`USDA failed: ${response.status}`);
    const data = await response.json();
    return (data.foods || []).map(normalizeUsdaFood);
  } catch {
    return [];
  }
}

// ─── Combined search ────────────────────────────────────────

function dedupKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function searchFoods(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const [usdaResults, offResults] = await Promise.allSettled([
    searchUSDA(query),
    searchOpenFoodFacts(query),
  ]);

  const usda = usdaResults.status === "fulfilled" ? usdaResults.value : [];
  const off = offResults.status === "fulfilled" ? offResults.value : [];

  // USDA first, then OFF, dedup by name
  const seen = new Set<string>();
  const results: SearchResult[] = [];

  for (const item of [...usda, ...off]) {
    const key = dedupKey(item.product_name);
    if (!seen.has(key)) {
      seen.add(key);
      results.push(item);
    }
  }

  return results;
}