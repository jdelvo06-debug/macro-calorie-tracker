/**
 * Client-side food search — calls USDA and OFF APIs directly from the browser.
 * Replaces the server-side /api/food-search route.
 */

import { type SearchResult } from "./open-food-facts";

const USDA_API_KEY = "uMpM168GlNeOwaF2eVUxKHKftZ7NmFjoU6JF4cLG";

// ─── Common serving size reference ──────────────────────────
// Used when USDA doesn't provide a serving size

const COMMON_SERVINGS: Record<string, { amount: number; unit: string; grams: number }> = {
  // Meats
  "bacon": { amount: 3, unit: "slices", grams: 34 },
  "chicken breast": { amount: 1, unit: "breast", grams: 172 },
  "chicken thigh": { amount: 1, unit: "thigh", grams: 136 },
  "ground beef": { amount: 4, unit: "oz", grams: 113 },
  "ground turkey": { amount: 4, unit: "oz", grams: 113 },
  "steak": { amount: 6, unit: "oz", grams: 170 },
  "pork chop": { amount: 1, unit: "chop", grams: 170 },
  "sausage": { amount: 2, unit: "links", grams: 76 },
  "ham": { amount: 3, unit: "oz", grams: 85 },
  "turkey breast": { amount: 4, unit: "oz", grams: 113 },
  "salmon": { amount: 6, unit: "oz", grams: 170 },
  "tuna": { amount: 1, unit: "can", grams: 142 },
  "shrimp": { amount: 4, unit: "oz", grams: 113 },
  // Dairy
  "milk": { amount: 1, unit: "cup", grams: 244 },
  "whole milk": { amount: 1, unit: "cup", grams: 244 },
  "egg": { amount: 1, unit: "large", grams: 50 },
  "eggs": { amount: 2, unit: "large", grams: 100 },
  "cheese": { amount: 1, unit: "oz", grams: 28 },
  "cheddar cheese": { amount: 1, unit: "oz", grams: 28 },
  "cottage cheese": { amount: 1, unit: "cup", grams: 226 },
  "greek yogurt": { amount: 1, unit: "cup", grams: 227 },
  "yogurt": { amount: 1, unit: "cup", grams: 227 },
  "butter": { amount: 1, unit: "tbsp", grams: 14 },
  "cream cheese": { amount: 2, unit: "tbsp", grams: 29 },
  // Grains
  "rice": { amount: 1, unit: "cup", grams: 158 },
  "white rice": { amount: 1, unit: "cup", grams: 158 },
  "brown rice": { amount: 1, unit: "cup", grams: 195 },
  "bread": { amount: 1, unit: "slice", grams: 28 },
  "oatmeal": { amount: 1, unit: "cup", grams: 234 },
  "pasta": { amount: 1, unit: "cup", grams: 140 },
  "cereal": { amount: 1, unit: "cup", grams: 40 },
  "tortilla": { amount: 1, unit: "tortilla", grams: 45 },
  "bagel": { amount: 1, unit: "bagel", grams: 105 },
  "english muffin": { amount: 1, unit: "muffin", grams: 57 },
  // Fruits
  "banana": { amount: 1, unit: "medium", grams: 118 },
  "apple": { amount: 1, unit: "medium", grams: 182 },
  "orange": { amount: 1, unit: "medium", grams: 131 },
  "strawberries": { amount: 1, unit: "cup", grams: 152 },
  "blueberries": { amount: 1, unit: "cup", grams: 148 },
  "grapes": { amount: 1, unit: "cup", grams: 151 },
  "avocado": { amount: 0.5, unit: "avocado", grams: 100 },
  // Vegetables
  "broccoli": { amount: 1, unit: "cup", grams: 91 },
  "spinach": { amount: 1, unit: "cup", grams: 30 },
  "sweet potato": { amount: 1, unit: "medium", grams: 130 },
  "potato": { amount: 1, unit: "medium", grams: 173 },
  "onion": { amount: 1, unit: "medium", grams: 110 },
  "carrot": { amount: 1, unit: "medium", grams: 61 },
  "lettuce": { amount: 2, unit: "cups", grams: 72 },
  "tomato": { amount: 1, unit: "medium", grams: 123 },
  // Nuts & Seeds
  "peanut butter": { amount: 2, unit: "tbsp", grams: 32 },
  "almonds": { amount: 1, unit: "oz", grams: 28 },
  "peanuts": { amount: 1, unit: "oz", grams: 28 },
  "walnuts": { amount: 1, unit: "oz", grams: 28 },
  // Drinks
  "coffee": { amount: 1, unit: "cup", grams: 240 },
  "protein powder": { amount: 1, unit: "scoop", grams: 30 },
  "protein shake": { amount: 1, unit: "scoop", grams: 30 },
};

function findServingSize(description: string): { amount: number; unit: string; grams: number } | null {
  const lower = description.toLowerCase();
  for (const [key, serving] of Object.entries(COMMON_SERVINGS)) {
    if (lower.includes(key)) return serving;
  }
  return null;
}

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

  // USDA returns nutrients per 100g. We need to convert to per-serving.
  const per100g = {
    calories: getNutrient(food.foodNutrients, NUTRIENT_IDS.calories),
    protein: getNutrient(food.foodNutrients, NUTRIENT_IDS.protein),
    carbs: getNutrient(food.foodNutrients, NUTRIENT_IDS.carbs),
    fat: getNutrient(food.foodNutrients, NUTRIENT_IDS.fat),
    fiber: getNutrient(food.foodNutrients, NUTRIENT_IDS.fiber),
    sugar: getNutrient(food.foodNutrients, NUTRIENT_IDS.sugar),
    sodium: getNutrient(food.foodNutrients, NUTRIENT_IDS.sodium),
  };

  // Determine serving size
  let servingGrams: number;
  let servingLabel: string;

  if (food.servingSize && food.servingSizeUnit) {
    servingGrams = food.servingSize;
    servingLabel = `${food.servingSize}${food.servingSizeUnit}`;
  } else {
    const common = findServingSize(food.description);
    if (common) {
      servingGrams = common.grams;
      servingLabel = `${common.amount} ${common.unit}`;
    } else {
      // Last resort: use 100g
      servingGrams = 100;
      servingLabel = "100g";
    }
  }

  // Convert per-100g to per-serving
  const ratio = servingGrams / 100;
  const perServing = {
    calories: Math.round(per100g.calories * ratio * 10) / 10,
    protein: Math.round(per100g.protein * ratio * 10) / 10,
    carbs: Math.round(per100g.carbs * ratio * 10) / 10,
    fat: Math.round(per100g.fat * ratio * 10) / 10,
    fiber: Math.round(per100g.fiber * ratio * 10) / 10,
    sugar: Math.round(per100g.sugar * ratio * 10) / 10,
    sodium: Math.round(per100g.sodium * ratio * 10) / 10,
  };

  return {
    code: `usda-${food.fdcId}`,
    product_name: food.description,
    brands: brand,
    serving_size: servingLabel,
    nutriments: {
      "energy-kcal_serving": perServing.calories,
      "energy-kcal_100g": per100g.calories,
      proteins_serving: perServing.protein,
      proteins_100g: per100g.protein,
      carbohydrates_serving: perServing.carbs,
      carbohydrates_100g: per100g.carbs,
      fat_serving: perServing.fat,
      fat_100g: per100g.fat,
      fiber_serving: perServing.fiber,
      fiber_100g: per100g.fiber,
      sugars_serving: perServing.sugar,
      sugars_100g: per100g.sugar,
      sodium_serving: perServing.sodium,
      sodium_100g: per100g.sodium,
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

// ─── Barcode lookup (Open Food Facts) ──────────────────────

export async function lookupBarcode(barcode: string): Promise<SearchResult | null> {
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`OFF barcode lookup failed: ${response.status}`);
    const data = await response.json();

    if (data.status !== 1 || !data.product) return null;

    const product = data.product;
    if (!product.product_name || !product.nutriments) return null;

    return {
      code: product.code || barcode,
      product_name: product.product_name,
      brands: product.brands,
      serving_size: product.serving_size || undefined,
      nutriments: product.nutriments,
      image_small_url: product.image_small_url || product.image_front_small_url || undefined,
      source: "OFF",
    } as SearchResult;
  } catch {
    return null;
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