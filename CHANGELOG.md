# Changelog

All notable changes to the Macro Calorie Tracker.

## [2026-04-18] — Code Review Fix Sprint

### Security
- **USDA API key** — Removed hardcoded key from client bundle; now uses `import.meta.env.USDA_FDC_API_KEY` (build-time injection via `astro.config.mjs`)
- **CSP** — Added `<meta http-equiv="Content-Security-Policy">` restricting `connect-src` to known API domains (USDA, OFF, Supabase)
- **Viewport** — Replaced `user-scalable=no` with `maximum-scale=5` (removes WCAG accessibility violation)

### Data Safety
- **syncFromCloud** — No longer calls `store.clear()` before writing cloud rows. Now uses `put` per row so local-only entries without cloud counterparts are preserved instead of destroyed
- **Atomic sync transactions** — Cloud data written in single IDB transactions via new `txComplete()` helper, preventing partial-state on page close mid-sync
- **Weight entry upsert** — Simplified to query-then-put pattern with documented unique date index constraint

### Architecture Cleanliness
- **Dead files removed** — `usda-fdc.ts`, `api.ts`, `CircularProgress.tsx`, `NutritionDetail.tsx`, `basic-auth.test.ts` all deleted
- **Dead dependency** — `html5-qrcode` removed from `package.json` (was replaced by Quagga2 in earlier sprint)
- **Duplicate types** — Removed `FoodLog`, `WeightEntry`, `Goals`, `OpenFoodFactsProduct` from `types.ts`; kept only `MealType`, `MEAL_LABELS`, `MEAL_ORDER`; all consumers now use `FoodLogEntry`/`WeightEntryRow`/`GoalsRow` from `db-client.ts`
- **Duplicate IndexedDB helpers** — `DataManager.tsx` had its own `openDB()`/`getAllFromStore()`; now imports from `db-client.ts`
- **Dead imports** — Removed unused `ThemeToggle` import and `savedTheme` variable from `settings.astro`; unused `addFoodLog` from `Diary.tsx`; unused `base` variable from `FoodSearch.tsx`; unused `GoalsRow` type from `GoalsSettings.tsx`
- **toFoodLogPayload** — Added `override` parameter so `FoodSearch.addFood()` passes computed nutrition directly instead of double-computing

### Barcode Scanner
- **Unified check-digit verification** — Camera scan and photo upload now both run `verifyCheckDigit()` (EAN-13 + UPC-A); previously camera path had no check-digit validation at all
- **Tighter barcode validation** — `isValidBarcode` now only accepts pure-numeric codes of known lengths (6, 8, 12, 13 digits); removed overly permissive alphanumeric pattern
- **Removed dead functions** — `verifyEAN13()` and `verifyUPCA()` replaced by unified `verifyCheckDigit()`
- **Fixed Quagga2 config** — Removed invalid `inputStream.name` property (TS error); corrected to `type: "LiveStream"`
- **Supported formats label** — Footer text changed from "Code-128/39" to "UPC-A, EAN-13, EAN-8" (matches actual decoder config)

### Mobile UX
- **Touch targets** — Goals stepper `−`/`+` buttons bumped to 44×44px minimum; Weight Log button bumped to `min-h-[48px]`
- **Keyboard types** — Added `inputMode="decimal"` + `enterKeyHint="done"` to weight and goal weight inputs; `inputMode="numeric"` to calorie input
- **Auto-select on focus** — Number inputs auto-select their value on focus for easier editing

### PWA
- **Service worker paths** — `PRECACHE_URLS` updated from `/`-prefixed to `/macro-calorie-tracker/`-prefixed (was 404ing on GitHub Pages)
- **Cache name** — Bumped from `macro-v1` to `macro-v2` to bust stale caches
- **Manifest** — Added `scope` and `start_url` with `/macro-calorie-tracker/` prefix; separated `any` and `maskable` icon entries

### Error Handling
- **React ErrorBoundary** — Created `ErrorBoundary.tsx` class component wrapping every island component in each Astro page; shows user-friendly error UI with retry button

### TypeScript
- **0 errors** — All 13 previously-reported TS errors fixed (was 13 errors + 0 warnings; now 0 errors + 0 warnings + 1 hint)
- `NutritionDetail.tsx` deleted (referenced dead `FoodLog` type)
- `Diary.tsx` — Added missing `created_at` to `updateFoodLog` call
- `FoodSearch.tsx` — Removed dead `recentToSearchResult` function and unused `base` variable
- `db-client.ts` — Fixed `getGoals()` return type narrowing
- `validation.ts` — Import `FoodLogEntry` from `db-client` instead of `FoodLog` from `types`
- `GoalsSettings.tsx` — Removed unused `GoalsRow` type import

### Docs
- **AGENTS.md** — Rewritten to reflect client-side architecture (removed references to server routes, LibSQL, Drizzle, basic-auth, middleware, etc.)
- **CLAUDE.md** — Synced with AGENTS.md content

## [2026-04-15] — Feature Sprint

### Added
- **Barcode scanner** — Quagga2 live camera scanning (UPC-A, EAN-13, EAN-8, UPC-E, Code-128, Code-39) + photo upload fallback
  - Check digit verification for EAN-13 and UPC-A (rejects false reads)
  - 2-read confirmation within 1.5s (prevents single-frame false positives)
  - Restricted detection area to center 80%×40% (reduces edge noise)
  - Dark vignette overlay with green corner brackets and animated scan line
  - Success flash showing detected barcode before auto-close
  - Double-vibrate haptic feedback
- **Serving unit toggle** — Each search result has servings / grams / oz toggle
  - Grams/oz modes: type amount, auto-calculate from per-100g data
  - Live calorie estimate shown next to input
  - Smart defaults when switching (1 serving → 100g → 4oz)
- **Recent foods tab** — One-tap re-log from history
  - `getRecentFoods()` queries IndexedDB, dedupes by food name, most recent first
  - Servings adjuster per recent item
  - Auto-refreshes after add
- **Export/Import** — Settings page → Data section
  - Export: downloads all IndexedDB data (food logs, weight, goals) as JSON
  - Import: reads JSON, clears IndexedDB, bulk-writes, triggers Supabase sync
  - Confirmation prompts before destructive operations

### Fixed
- **Serving display** — "10x 10 kcal" → total calories with context line ("2 × 3 slices (106 kcal)")
- **Barcode scan button** — moved from hidden icon inside search bar to prominent green button
- **Scanner format support** — html5-qrcode only scanned QR codes by default; Quagga2 reads all 1D barcodes

### Changed
- `FoodSearch.tsx` — added `servingModes` state, `calcNutrition()` helper for grams/oz calculation
- `BarcodeScanner.tsx` — 3 rewrites: html5-qrcode → Quagga2 with proper config → polished with validation
- `food-search-client.ts` — added `lookupBarcode()` for OFF barcode API
- `db-client.ts` — added `getRecentFoods()` for recent tab
- `DataManager.tsx` — new component for export/import
- `settings.astro` — integrated DataManager component

## [2026-04-15] — Serving Size Overhaul + Routing Fix

### Fixed
- **USDA per-serving conversion** — nutrients (always per 100g from API) now auto-converted to per-serving
- Added common serving size lookup table (~50 foods: bacon, chicken breast, rice, eggs, etc.)
- **GitHub Pages routing** — all internal links now use `/macro-calorie-tracker/` base path
- React components hardcoded with base constant; Astro components auto-respect config
- Added `public/404.html` SPA redirect fallback

### Changed
- `food-search-client.ts` — `normalizeUsdaFood()` populates both `_serving` and `_100g` nutrient keys
- `FoodSearch.tsx` — calorie display shows "per 3 slices" / "per 1 cup" instead of always "per 100g"

## [2026-04-15] — Supabase Cloud Sync

### Added
- `@supabase/supabase-js` package
- `src/lib/supabase.ts` — Supabase client
- Dual-write pattern in `src/lib/db-client.ts` — IndexedDB first, then async Supabase push
- `syncFromCloud()` on page load and `online` event
- Supabase schema: `food_log`, `weight_entries`, `goals` tables
- RLS policies: `USING (true)` / `WITH CHECK (true)` (single-user, no auth)

### Changed
- `AppLayout.astro` — triggers `syncFromCloud()` on mount and `online` event
- GitHub Actions workflow — passes Supabase env vars at build time

## [2026-04-15] — PWA + Static Migration

### Added
- PWA manifest (`public/manifest.json`) — standalone, portrait
- Service worker (`public/sw.js`) — cache-first assets, network-first API
- App icons: 192px, 512px, SVG
- Meta tags: `apple-mobile-web-app-capable`, `theme-color`, status bar style
- `.github/workflows/deploy.yml` — GitHub Actions auto-deploy to GitHub Pages

### Changed
- **Architecture**: Server-rendered (LibSQL + Drizzle + Node adapter) → fully static (IndexedDB)
- `astro.config.mjs` — `output: 'static'`, `base: '/macro-calorie-tracker'`
- All components migrated from `apiRequest()` to direct IndexedDB calls
- Mobile CSS: 16px min font on inputs, safe area insets, `viewport-fit=cover`

### Removed
- `src/middleware.ts`, `src/lib/basic-auth.ts` — no server auth needed
- `src/lib/db.ts`, `src/lib/schema.ts`, `drizzle.config.ts` — LibSQL/Drizzle removed
- `src/pages/api/*` — all server API routes removed
- `src/pages/food/[id].astro` — server-rendered food detail page
- `@astrojs/node`, `@astrojs/sitemap`, `drizzle-orm`, `@libsql/client` packages

## [Unreleased] — Original Model Wars Build

- Astro + React + Tailwind CSS + LibSQL/Turso
- Server-rendered with Node adapter
- Basic auth middleware
- Open Food Facts + USDA food search via API routes
- Dashboard, diary, weight tracker, goals settings