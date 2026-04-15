import type { APIRoute } from "astro";
import { json, jsonError } from "../../lib/api";
import { type SearchResult } from "../../lib/open-food-facts";
import { searchUSDA } from "../../lib/usda-fdc";

export const prerender = false;

function normalizeKey(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

async function searchOpenFoodFacts(query: string): Promise<SearchResult[]> {
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=20&fields=code,product_name,brands,serving_size,nutriments,image_small_url`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`OFF failed: ${response.status}`);
    const data = await response.json();
    return (data.products || []).filter((p: SearchResult) => p.product_name && p.nutriments);
  } catch (err) {
    clearTimeout(timeout);
    console.error("OFF error:", err);
    return [];
  }
}

export const GET: APIRoute = async ({ url }) => {
  const query = url.searchParams.get("q")?.trim() ?? "";
  if (!query) return json([]);

  try {
    const [usdaResults, offResults] = await Promise.allSettled([
      searchUSDA(query),
      searchOpenFoodFacts(query),
    ]);

    const usda = usdaResults.status === "fulfilled" ? usdaResults.value : [];
    const off = offResults.status === "fulfilled" ? offResults.value : [];

    if (usdaResults.status === "rejected") console.error("USDA error:", usdaResults.reason);
    if (offResults.status === "rejected") console.error("OFF error:", offResults.reason);

    const seen = new Set<string>();
    const merged: (SearchResult & { source: string })[] = [];

    for (const result of [...usda, ...off]) {
      const key = normalizeKey(result.product_name);
      if (!seen.has(key)) {
        seen.add(key);
        merged.push({ ...result, source: (result as any).source ?? "OFF" });
      }
    }

    return json(merged);
  } catch (error) {
    return jsonError(error);
  }
};
