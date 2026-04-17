import { useEffect, useRef, useState } from "react";

import { addFoodLog, getRecentFoods, type FoodLogEntry } from "../lib/db-client";
import { searchFoods, lookupBarcode } from "../lib/food-search-client";
import { getServingSize, toFoodLogPayload } from "../lib/open-food-facts";
import BarcodeScanner from "./BarcodeScanner";
import type { MealType } from "../lib/types";
import { MEAL_LABELS, MEAL_ORDER } from "../lib/types";
import { isMealType } from "../lib/validation";
import { isDateKey, toDateKey, toFriendlyDate } from "../lib/date";
import type { SearchResult } from "../lib/open-food-facts";

const base = '/macro-calorie-tracker/';

type Tab = "search" | "recent";
type ServingMode = "servings" | "grams" | "oz";

export default function FoodSearch() {
  const [tab, setTab] = useState<Tab>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentItems, setRecentItems] = useState<FoodLogEntry[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [looking, setLooking] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [adding, setAdding] = useState<string | null>(null);
  const [servings, setServings] = useState<Record<string, number>>({});
  const [servingModes, setServingModes] = useState<Record<string, ServingMode>>({});
  const [searchError, setSearchError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestId = useRef(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const date = params.get("date");
    const meal = params.get("meal");

    if (date && isDateKey(date)) {
      setSelectedDate(date);
    }

    if (meal && isMealType(meal)) {
      setSelectedMeal(meal);
    }

    return () => {
      if (debounceRef.current != null) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Load recent foods when tab switches
  useEffect(() => {
    if (tab === "recent") {
      getRecentFoods(30).then(setRecentItems);
    }
  }, [tab]);

  // Refresh recent after a successful add
  useEffect(() => {
    if (actionMessage && !actionMessage.isError && tab === "recent") {
      getRecentFoods(30).then(setRecentItems);
    }
  }, [actionMessage, tab]);

  async function search(q: string) {
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      setSearching(false);
      setSearchError(null);
      return;
    }

    const requestId = ++searchRequestId.current;
    setSearching(true);
    setSearched(true);
    setSearchError(null);

    try {
      const data = await searchFoods(q);

      if (requestId !== searchRequestId.current) {
        return;
      }

      setResults(data.filter((product) => product.product_name && product.nutriments));
    } catch (err) {
      if (requestId !== searchRequestId.current) {
        return;
      }

      setResults([]);
      setSearchError(err instanceof Error ? err.message : "Search failed.");
    } finally {
      if (requestId === searchRequestId.current) {
        setSearching(false);
      }
    }
  }

  function handleInput(value: string) {
    setQuery(value);
    if (debounceRef.current != null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => search(value), 400);
  }

  function getCalsPer(product: SearchResult): { value: number; label: string } {
    const perServing = product.nutriments["energy-kcal_serving"];
    const per100g = product.nutriments["energy-kcal_100g"];
    const serving = getServingSize(product);

    if (perServing && serving !== "100g") {
      return { value: Math.round(perServing), label: `per ${serving}` };
    }

    return { value: Math.round(per100g || perServing || 0), label: `per 100g` };
  }

  /** Calculate nutrition based on serving mode */
  function calcNutrition(product: SearchResult): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number | null;
    sugar: number | null;
    sodium: number | null;
    servings: number;
    servingLabel: string;
  } {
    const mode = servingModes[product.code] || "servings";
    const amount = servings[product.code] || 1;
    const nutriments = product.nutriments;
    const perServing = {
      calories: nutriments["energy-kcal_serving"] ?? nutriments["energy-kcal_100g"] ?? 0,
      protein: nutriments.proteins_serving ?? nutriments.proteins_100g ?? 0,
      carbs: nutriments.carbohydrates_serving ?? nutriments.carbohydrates_100g ?? 0,
      fat: nutriments.fat_serving ?? nutriments.fat_100g ?? 0,
      fiber: nutriments.fiber_serving ?? nutriments.fiber_100g ?? null,
      sugar: nutriments.sugars_serving ?? nutriments.sugars_100g ?? null,
      sodium: nutriments.sodium_serving ?? nutriments.sodium_100g ?? null,
    };

    if (mode === "grams") {
      // amount = grams, calculate from per-100g values
      const ratio = amount / 100;
      return {
        calories: Math.round((nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal_serving"] ?? 0) * ratio),
        protein: Math.round((nutriments.proteins_100g ?? nutriments.proteins_serving ?? 0) * ratio * 10) / 10,
        carbs: Math.round((nutriments.carbohydrates_100g ?? nutriments.carbohydrates_serving ?? 0) * ratio * 10) / 10,
        fat: Math.round((nutriments.fat_100g ?? nutriments.fat_serving ?? 0) * ratio * 10) / 10,
        fiber: nutriments.fiber_100g != null ? Math.round(nutriments.fiber_100g * ratio * 10) / 10 : null,
        sugar: nutriments.sugars_100g != null ? Math.round(nutriments.sugars_100g * ratio * 10) / 10 : null,
        sodium: nutriments.sodium_100g != null ? Math.round(nutriments.sodium_100g * ratio * 10) / 10 : null,
        servings: ratio,
        servingLabel: `${amount}g`,
      };
    }

    if (mode === "oz") {
      // amount = oz, convert to grams then calculate from per-100g
      const grams = amount * 28.3495;
      const ratio = grams / 100;
      return {
        calories: Math.round((nutriments["energy-kcal_100g"] ?? nutriments["energy-kcal_serving"] ?? 0) * ratio),
        protein: Math.round((nutriments.proteins_100g ?? nutriments.proteins_serving ?? 0) * ratio * 10) / 10,
        carbs: Math.round((nutriments.carbohydrates_100g ?? nutriments.carbohydrates_serving ?? 0) * ratio * 10) / 10,
        fat: Math.round((nutriments.fat_100g ?? nutriments.fat_serving ?? 0) * ratio * 10) / 10,
        fiber: nutriments.fiber_100g != null ? Math.round(nutriments.fiber_100g * ratio * 10) / 10 : null,
        sugar: nutriments.sugars_100g != null ? Math.round(nutriments.sugars_100g * ratio * 10) / 10 : null,
        sodium: nutriments.sodium_100g != null ? Math.round(nutriments.sodium_100g * ratio * 10) / 10 : null,
        servings: ratio,
        servingLabel: `${amount}oz`,
      };
    }

    // Default: servings mode
    const servingSize = getServingSize(product);
    return {
      calories: Math.round(perServing.calories * amount),
      protein: Math.round(perServing.protein * amount * 10) / 10,
      carbs: Math.round(perServing.carbs * amount * 10) / 10,
      fat: Math.round(perServing.fat * amount * 10) / 10,
      fiber: perServing.fiber != null ? Math.round(perServing.fiber * amount * 10) / 10 : null,
      sugar: perServing.sugar != null ? Math.round(perServing.sugar * amount * 10) / 10 : null,
      sodium: perServing.sodium != null ? Math.round(perServing.sodium * amount * 10) / 10 : null,
      servings: amount,
      servingLabel: amount > 1 ? `${amount} × ${servingSize}` : servingSize,
    };
  }

  async function addFood(product: SearchResult) {
    setAdding(product.code);
    setActionMessage(null);

    const nutrition = calcNutrition(product);

    const payload = toFoodLogPayload(product, {
      date: selectedDate,
      meal_type: selectedMeal,
      servings: nutrition.servings,
    });

    // Override with calculated values when using grams/oz mode
    const finalPayload = {
      ...payload,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sugar: nutrition.sugar,
      sodium: nutrition.sodium,
      serving_size: nutrition.servingLabel,
      servings: nutrition.servings,
    };

    try {
      await addFoodLog(finalPayload);
      setActionMessage({ text: `Added to ${MEAL_LABELS[selectedMeal]} on ${toFriendlyDate(selectedDate)}.`, isError: false });
    } catch (error) {
      setActionMessage({ text: error instanceof Error ? error.message : "Failed to add food.", isError: true });
    } finally {
      setAdding(null);
    }
  }

  /** Quick-add a recent food item directly */
  async function addRecentItem(item: FoodLogEntry) {
    setAdding(`recent-${item.id}`);
    setActionMessage(null);

    const servingCount = servings[`recent-${item.id}`] || item.servings;

    try {
      await addFoodLog({
        date: selectedDate,
        meal_type: selectedMeal,
        food_name: item.food_name,
        brand: item.brand,
        serving_size: item.serving_size,
        servings: servingCount,
        calories: item.calories,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
        fiber: item.fiber,
        sugar: item.sugar,
        sodium: item.sodium,
        vitamins: item.vitamins,
        barcode: item.barcode,
      });
      setActionMessage({ text: `Added ${item.food_name} to ${MEAL_LABELS[selectedMeal]}.`, isError: false });
    } catch (error) {
      setActionMessage({ text: error instanceof Error ? error.message : "Failed to add food.", isError: true });
    } finally {
      setAdding(null);
    }
  }

  /** Handle barcode scan result */
  async function handleBarcodeScan(barcode: string) {
    setLooking(true);
    setSearchError(null);

    try {
      const product = await lookupBarcode(barcode);
      if (product) {
        setResults([product]);
        setSearched(true);
        setTab("search");
        setActionMessage({ text: `Found: ${product.product_name}`, isError: false });
      } else {
        setSearchError(`Barcode ${barcode} not found in Open Food Facts. Try searching by name instead.`);
      }
    } catch {
      setSearchError(`Barcode lookup failed. Try searching by name instead.`);
    } finally {
      setLooking(false);
    }
  }

  /** Convert a FoodLogEntry into a SearchResult-like object for the addFood function */
  function recentToSearchResult(item: FoodLogEntry): SearchResult {
    return {
      code: `recent-${item.id}`,
      product_name: item.food_name,
      brands: item.brand || undefined,
      serving_size: item.serving_size || undefined,
      nutriments: {
        "energy-kcal_serving": item.calories,
        "energy-kcal_100g": item.calories,
        proteins_serving: item.protein,
        proteins_100g: item.protein,
        carbohydrates_serving: item.carbs,
        carbohydrates_100g: item.carbs,
        fat_serving: item.fat,
        fat_100g: item.fat,
        fiber_serving: item.fiber,
        fiber_100g: item.fiber,
        sugars_serving: item.sugar,
        sugars_100g: item.sugar,
        sodium_serving: item.sodium,
        sodium_100g: item.sodium,
      },
      source: "Recent",
    };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Log Food</h1>
        <p className="text-sm text-zinc-500 mt-1">Search the USDA & Open Food Facts database</p>
        <p className="text-xs text-zinc-400 mt-3">
          Logging for <span className="text-zinc-200">{toFriendlyDate(selectedDate)}</span> in{" "}
          <span className="text-emerald-400">{MEAL_LABELS[selectedMeal]}</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="space-y-1">
          <span className="text-xs font-medium text-zinc-400">Date</span>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => setSelectedDate(event.target.value)}
            className="w-full rounded-xl bg-surface border border-border-subtle px-4 py-3 text-zinc-100 focus:outline-none focus:border-zinc-600"
          />
        </label>
        <div className="rounded-xl border border-border-subtle bg-surface px-4 py-3 text-xs text-zinc-500 self-end">
          Add multiple items if needed. Nothing is locked after one add.
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {MEAL_ORDER.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setSelectedMeal(type)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all active:scale-[0.98] ${
              selectedMeal === type
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800/50 text-zinc-400 border border-transparent hover:bg-zinc-800"
            }`}
          >
            {MEAL_LABELS[type]}
          </button>
        ))}
      </div>

      {/* Tab Switcher: Search / Recent */}
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-800/50 border border-border-subtle">
        <button
          type="button"
          onClick={() => setTab("search")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "search"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🔍 Search
        </button>
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            tab === "recent"
              ? "bg-zinc-700 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-200"
          }`}
        >
          🕐 Recent
        </button>
      </div>

      {tab === "search" && (
        <>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(event) => handleInput(event.target.value)}
                placeholder="Search foods, brands..."
                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-surface border border-border-subtle text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 transition-colors"
                autoFocus
                aria-label="Search foods"
              />
              {searching && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-zinc-600 border-t-emerald-400 rounded-full animate-spin" />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setScanning(true)}
              className="shrink-0 px-4 py-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center gap-2 text-sm font-medium active:scale-[0.98]"
              aria-label="Scan barcode"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125-1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
              </svg>
              <span className="hidden sm:inline">Scan</span>
            </button>
          </div>

          {looking && (
            <div className="rounded-xl bg-blue-500/10 border border-blue-500/20 p-4 text-sm text-blue-300 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
              Looking up barcode...
            </div>
          )}

          {searchError && (
            <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-300">
              {searchError}
            </div>
          )}

          {searched && !searching && results.length === 0 && !searchError && (
            <div className="rounded-2xl bg-surface border border-border-subtle p-8 text-center">
              <p className="text-zinc-500 text-sm">No results found for "{query}"</p>
              <p className="text-zinc-600 text-xs mt-1">Try a different search term or brand name</p>
            </div>
          )}

          <div className="space-y-2">
            {results.map((product) => {
              const calories = getCalsPer(product);
              const isAdding = adding === product.code;
              const mode = servingModes[product.code] || "servings";
              const amount = servings[product.code] || 1;
              const nutrition = calcNutrition(product);

              return (
                <div
                  key={product.code}
                  className="rounded-xl bg-surface border border-border-subtle p-4 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    {product.image_small_url && (
                      <img
                        src={product.image_small_url}
                        alt={product.product_name}
                        className="w-12 h-12 rounded-lg object-cover bg-zinc-800 shrink-0"
                        loading="lazy"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{product.product_name}</p>
                      {product.brands && <p className="text-xs text-zinc-500 truncate">{product.brands}</p>}
                      {product.source && (
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                          product.source === "USDA"
                            ? "bg-green-500/15 text-green-400"
                            : product.source === "OFF"
                            ? "bg-blue-500/15 text-blue-400"
                            : "bg-zinc-700/50 text-zinc-400"
                        }`}>
                          {product.source === "USDA" ? "USDA" : product.source === "OFF" ? "Open Food Facts" : product.source}
                        </span>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-xs font-mono text-zinc-400">{calories.value} kcal</span>
                        <span className="text-xs text-zinc-600">{calories.label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border-subtle">
                    {/* Serving mode toggle */}
                    <div className="flex items-center gap-1">
                      {(["servings", "grams", "oz"] as ServingMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setServingModes((prev) => ({ ...prev, [product.code]: m }));
                            if (m === "servings" && (!servings[product.code] || servings[product.code] === 0)) {
                              setServings((prev) => ({ ...prev, [product.code]: 1 }));
                            } else if (m === "grams" && (!servings[product.code] || servings[product.code] === 1)) {
                              setServings((prev) => ({ ...prev, [product.code]: 100 }));
                            } else if (m === "oz" && (!servings[product.code] || servings[product.code] === 1)) {
                              setServings((prev) => ({ ...prev, [product.code]: 4 }));
                            }
                          }}
                          className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] min-w-[80px] ${
                            mode === m
                              ? "bg-zinc-700 text-zinc-100"
                              : "text-zinc-500 hover:text-zinc-300"
                          }`
                        }
                        >
                          {m === "servings" ? "× servings" : m === "grams" ? "grams" : "oz"}
                        </button>
                      ))}
                    </div>

                    {/* Amount input */}
                    <div className="flex items-center gap-2">
                      {/* Stepper control for all modes - consistent mobile UX */}
                      <div className="flex items-center rounded-lg bg-zinc-800/50 border border-border-subtle min-h-[44px]">
                        <button
                          type="button"
                          aria-label={`Decrease ${mode} for ${product.product_name}`}
                          onClick={() => {
                            if (mode === "servings") {
                              setServings((current) => ({
                                ...current,
                                [product.code]: Math.max(0.25, (current[product.code] || 1) - 0.5),
                              }));
                            } else if (mode === "grams") {
                              setServings((current) => ({
                                ...current,
                                [product.code]: Math.max(5, (current[product.code] || 100) - 5),
                              }));
                            } else {
                              setServings((current) => ({
                                ...current,
                                [product.code]: Math.max(0.5, (current[product.code] || 4) - 0.5),
                              }));
                            }
                          }}
                          className="px-4 py-3 text-zinc-400 hover:text-zinc-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          −
                        </button>
                        <button
                          type="button"
                          aria-label={`${mode} amount for ${product.product_name}`}
                          onClick={() => {
                            const input = document.getElementById(`${product.code}-amount-input`);
                            if (input) {
                              (input as HTMLInputElement).focus();
                              (input as HTMLInputElement).select();
                            }
                          }}
                          className="flex-1 px-2 py-3 text-sm font-mono text-zinc-300 min-w-[3rem] text-center hover:bg-zinc-700/50 transition-colors min-h-[44px]"
                        >
                          {amount}
                        </button>
                        <input
                          id={`${product.code}-amount-input`}
                          type="number"
                          inputMode="decimal"
                          enterKeyHint="done"
                          min="0"
                          step={mode === "oz" ? "0.5" : mode === "grams" ? "5" : "0.5"}
                          value={amount}
                          onChange={(e) =>
                            setServings((current) => ({
                              ...current,
                              [product.code]: Math.max(0, parseFloat(e.target.value) || 0),
                            }))
                          }
                          onFocus={(e) => {
                            e.target.select();
                          }}
                          className="absolute opacity-0 pointer-events-none w-0 h-0"
                          aria-hidden="true"
                        />
                        <button
                          type="button"
                          aria-label={`Increase ${mode} for ${product.product_name}`}
                          onClick={() => {
                            if (mode === "servings") {
                              setServings((current) => ({
                                ...current,
                                [product.code]: (current[product.code] || 1) + 0.5,
                              }));
                            } else if (mode === "grams") {
                              setServings((current) => ({
                                ...current,
                                [product.code]: (current[product.code] || 100) + 5,
                              }));
                            } else {
                              setServings((current) => ({
                                ...current,
                                [product.code]: (current[product.code] || 4) + 0.5,
                              }));
                            }
                          }}
                          className="px-4 py-3 text-zinc-400 hover:text-zinc-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-xs text-zinc-500 ml-2">
                        {mode === "grams" ? "g" : mode === "oz" ? "oz" : "servings"}
                      </span>
                      <span className="text-xs text-zinc-500 ml-1">
                        ≈ {nutrition.calories} kcal
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => addFood(product)}
                      disabled={isAdding}
                      className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      {isAdding ? "Adding..." : `Add to ${MEAL_LABELS[selectedMeal]}`}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {tab === "recent" && (
        <>
          {recentItems.length === 0 ? (
            <div className="rounded-2xl bg-surface border border-border-subtle p-8 text-center">
              <p className="text-zinc-500 text-sm">No recent foods yet</p>
              <p className="text-zinc-600 text-xs mt-1">Foods you log will appear here for quick re-logging</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentItems.map((item) => {
                const key = `recent-${item.id}`;
                const isAdding = adding === key;
                const servingCount = servings[key] || item.servings;

                return (
                  <div
                    key={key}
                    className="rounded-xl bg-surface border border-border-subtle p-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-200 truncate">{item.food_name}</p>
                        {item.brand && <p className="text-xs text-zinc-500 truncate">{item.brand}</p>}
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-xs font-mono text-zinc-400">{Math.round(item.calories * servingCount)} kcal</span>
                          {item.serving_size && (
                            <span className="text-xs text-zinc-600">per {item.serving_size}</span>
                          )}
                          <span className="text-xs text-protein/70">P {Math.round(item.protein * servingCount)}g</span>
                          <span className="text-xs text-carbs/70">C {Math.round(item.carbs * servingCount)}g</span>
                          <span className="text-xs text-fat/70">F {Math.round(item.fat * servingCount)}g</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-border-subtle">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-zinc-500">Servings:</span>
                        <div className="flex items-center rounded-lg bg-zinc-800/50 border border-border-subtle">
                          <button
                            type="button"
                            onClick={() =>
                              setServings((current) => ({
                                ...current,
                                [key]: Math.max(0.25, (current[key] || item.servings) - 0.5),
                              }))
                            }
                            className="px-4 py-3 text-zinc-400 hover:text-zinc-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            −
                          </button>
                          <span className="px-2 py-1 text-sm font-mono text-zinc-300 min-w-[2rem] text-center">
                            {servingCount}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setServings((current) => ({
                                ...current,
                                [key]: (current[key] || item.servings) + 0.5,
                              }))
                            }
                            className="px-4 py-3 text-zinc-400 hover:text-zinc-200 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => addRecentItem(item)}
                        disabled={isAdding}
                        className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
                      >
                        {isAdding ? "Adding..." : `Add to ${MEAL_LABELS[selectedMeal]}`}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {actionMessage && (
        <div className={`rounded-xl px-4 py-3 text-sm ${actionMessage.isError ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {actionMessage.text}
        </div>
      )}

      {scanning && (
        <BarcodeScanner
          onScan={handleBarcodeScan}
          onClose={() => setScanning(false)}
        />
      )}
    </div>
  );
}