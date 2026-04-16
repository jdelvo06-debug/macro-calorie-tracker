import { useEffect, useRef, useState } from "react";

import { addFoodLog, type FoodLogEntry } from "../lib/db-client";
import { searchFoods } from "../lib/food-search-client";
import { getServingSize, toFoodLogPayload } from "../lib/open-food-facts";
import type { MealType } from "../lib/types";
import { MEAL_LABELS, MEAL_ORDER } from "../lib/types";
import { isMealType } from "../lib/validation";
import { isDateKey, toDateKey, toFriendlyDate } from "../lib/date";
import type { SearchResult } from "../lib/open-food-facts";

export default function FoodSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealType>("breakfast");
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [adding, setAdding] = useState<string | null>(null);
  const [servings, setServings] = useState<Record<string, number>>({});
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

    // If we have per-serving data and a real serving size (not just "100g")
    if (perServing && serving !== "100g") {
      return { value: Math.round(perServing), label: `per ${serving}` };
    }

    return { value: Math.round(per100g || perServing || 0), label: `per 100g` };
  }

  async function addFood(product: SearchResult) {
    setAdding(product.code);
    setActionMessage(null);

    const servingCount = servings[product.code] || 1;

    const payload = toFoodLogPayload(product, {
      date: selectedDate,
      meal_type: selectedMeal,
      servings: servingCount,
    });

    try {
      await addFoodLog(payload);
      setActionMessage({ text: `Added to ${MEAL_LABELS[selectedMeal]} on ${toFriendlyDate(selectedDate)}.`, isError: false });
    } catch (error) {
      setActionMessage({ text: error instanceof Error ? error.message : "Failed to add food.", isError: true });
    } finally {
      setAdding(null);
    }
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

      <div className="relative">
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
          placeholder="Search foods, brands, barcodes..."
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

      {actionMessage && (
        <div className={`rounded-xl px-4 py-3 text-sm ${actionMessage.isError ? "bg-red-500/10 text-red-300" : "bg-emerald-500/10 text-emerald-300"}`}>
          {actionMessage.text}
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
          const servingCount = servings[product.code] || 1;

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
                        : "bg-blue-500/15 text-blue-400"
                    }`}>
                      {product.source === "USDA" ? "USDA" : "Open Food Facts"}
                    </span>
                  )}
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs font-mono text-zinc-400">{calories.value} kcal</span>
                    <span className="text-xs text-zinc-600">{calories.label}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mt-3 pt-3 border-t border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">Servings:</span>
                  <div className="flex items-center rounded-lg bg-zinc-800/50 border border-border-subtle">
                    <button
                      type="button"
                      aria-label={`Decrease servings for ${product.product_name}`}
                      onClick={() =>
                        setServings((current) => ({
                          ...current,
                          [product.code]: Math.max(0.25, (current[product.code] || 1) - 0.5),
                        }))
                      }
                      className="px-3 py-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      −
                    </button>
                    <span className="px-2 py-1 text-sm font-mono text-zinc-300 min-w-[2rem] text-center">
                      {servingCount}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase servings for ${product.product_name}`}
                      onClick={() =>
                        setServings((current) => ({
                          ...current,
                          [product.code]: (current[product.code] || 1) + 0.5,
                        }))
                      }
                      className="px-3 py-1 text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => addFood(product)}
                  disabled={isAdding}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-[0.98] bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  {isAdding ? "Adding..." : `Add to ${MEAL_LABELS[selectedMeal]}`}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}