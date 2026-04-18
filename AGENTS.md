# AGENTS.md

This file provides guidance when working with code in this repository.

## Commands

```sh
npm run dev            # Astro dev server at http://localhost:4321
npm run build          # Production build (static output for GitHub Pages)
npm run preview        # Preview the built app
npm run typecheck      # astro check — strict TS + .astro diagnostics
npm run test           # vitest in watch mode
npm run test:run       # vitest one-shot (CI mode)
npm run test:coverage  # vitest run with v8 coverage
npx vitest run src/lib/validation.test.ts          # Run one test file
npx vitest run -t "merges fiber null"              # Run by test name pattern
```

Node `>=22.12.0` required. No linter is configured — `astro check` is the only static gate.

## Architecture

### Static site with React islands
This is a **static client-side app** deployed to GitHub Pages (`output: 'static'`). There are no server API routes. Pages under `src/pages/*.astro` are static shells that mount React components as islands (`client:load`). All state and data access lives in the browser via IndexedDB + Supabase.

### Data layer
- **IndexedDB** (`src/lib/db-client.ts`) is the primary offline-first store. Three object stores: `food_logs`, `weight_entries`, `goals`.
- **Supabase** (`src/lib/supabase.ts`) provides cloud persistence. Every write goes to IndexedDB first, then syncs to Supabase via fire-and-forget `upsert`. On page load and `online` event, `syncFromCloud()` pulls cloud data and writes it into IndexedDB using atomic transactions.
- Types are defined in `src/lib/db-client.ts` (`FoodLogEntry`, `WeightEntryRow`, `GoalsRow`). Do not add separate type files for these — keep them co-located.

### Food search
- `src/lib/food-search-client.ts` calls USDA FDC and Open Food Facts **directly from the browser** (no server proxy).
- USDA API key is injected at build time via `import.meta.env.USDA_FDC_API_KEY` (set in `astro.config.mjs` via `vite.define`).
- `src/lib/open-food-facts.ts` defines the `SearchResult` interface and `toFoodLogPayload` helper.
- Barcode scanning (`src/components/BarcodeScanner.tsx`) uses Quagga2 for live camera scanning + photo upload fallback.

### Validation
`src/lib/validation.ts` is the single source of truth for input validation. Key points:
- All numeric payloads pass through `nutritionNumberSchema` (finite, ≥0, ≤100000).
- `dateKeySchema` enforces both `YYYY-MM-DD` format **and** a real calendar date via `isDateKey()`.
- `mergeFoodLogUpdate(existing, update)` uses explicit `=== undefined` checks for nullable fields so that `null` clears them. Do not switch to `??`.
- Goals require `protein_pct + carbs_pct + fat_pct === 100` via `superRefine`.

### Dates
`src/lib/date.ts` owns date handling. Use `toDateKey()`, `parseDateKey()`, `addDays()`, `isDateKey()`, `toFriendlyDate()` instead of raw `new Date(string)` / `toISOString()`.

### Theming
`data-theme` attribute on `<html>` switches dark/light, persisted to `localStorage`. `src/styles/global.css` handles overrides. Light mode has some `!important` zinc overrides — prefer CSS variables on `:root` / `[data-theme="light"]` over adding more `!important`.

### PWA
`public/sw.js` is the service worker (cache-first for assets, stale-while-revalidate for pages). `public/manifest.json` is the web app manifest. The `CACHE_NAME` must be bumped manually on deploy.

## Gotchas

- **Supabase RLS is fully open** (`USING (true)`). The anon key is in the client bundle. This is documented as acceptable for a single-user app.
- **Sync is not merge, it's cloud-wins.** `syncFromCloud()` uses `put` (not `clear` + `put`), so cloud rows overwrite matching IDs but local-only entries without cloud counterparts are preserved.
- **ID collisions possible.** If two devices add entries offline, both get auto-increment IDs from IndexedDB. When syncing, Supabase upsert with `onConflict: "id"` will overwrite. Use UUIDs if multi-device becomes important.
- **Macro split on nutrition detail is calorie-weighted**, not gram-weighted (protein/carbs × 4, fat × 9).
- **No per-user data isolation.** This is a single-user app.

## Tests

Vitest runs in Node env against `src/lib/*.test.ts`. Coverage is helper-level only — there are no component, route, or integration tests. When changing validation, date, or open-food-facts helpers, update the adjacent `.test.ts`.