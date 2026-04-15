export interface FoodLog {
  id: number;
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

export interface WeightEntry {
  id: number;
  date: string;
  weight: number;
  created_at: string;
}

export interface Goals {
  id: number;
  daily_calories: number;
  protein_pct: number;
  carbs_pct: number;
  fat_pct: number;
  goal_weight: number | null;
  updated_at: string;
}

export interface OpenFoodFactsProduct {
  code: string;
  product_name: string;
  brands: string;
  serving_size: string;
  nutriments: {
    "energy-kcal_100g"?: number;
    "energy-kcal_serving"?: number;
    proteins_100g?: number;
    proteins_serving?: number;
    carbohydrates_100g?: number;
    carbohydrates_serving?: number;
    fat_100g?: number;
    fat_serving?: number;
    fiber_100g?: number;
    fiber_serving?: number;
    sugars_100g?: number;
    sugars_serving?: number;
    sodium_100g?: number;
    sodium_serving?: number;
    "vitamin-a_100g"?: number;
    "vitamin-c_100g"?: number;
    calcium_100g?: number;
    iron_100g?: number;
    potassium_100g?: number;
  };
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
