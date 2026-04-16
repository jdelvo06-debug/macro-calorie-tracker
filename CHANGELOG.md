# Changelog

All notable changes to the Macro Calorie Tracker.

## [2026-04-15] — Serving Size Overhaul + Routing Fix

### Fixed
- **USDA per-serving conversion** — nutrients (always per 100g from API) now auto-converted to per-serving based on food's serving size
- Added common serving size lookup table (~50 foods: bacon, chicken breast, rice, eggs, etc.)
- **GitHub Pages routing** — all internal links now use `/macro-calorie-tracker/` base path
- React components (MobileNav, Dashboard, Diary, NutritionDetail) hardcoded with base constant
- Desktop sidebar links fixed with full base path
- Double closing brace typo in Diary.tsx

### Changed
- `food-search-client.ts` — `normalizeUsdaFood()` now populates both `_serving` and `_100g` nutrient keys with correct values
- `FoodSearch.tsx` — calorie display shows "per 3 slices" / "per 1 cup" instead of always "per 100g"
- Mobile nav, dashboard quick-add, diary add-meal links all use base path

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
- `.env` — now requires `SUPABASE_URL` and `SUPABASE_ANON_KEY`
- GitHub Actions workflow — passes Supabase env vars at build time

## [2026-04-15] — PWA + Static Migration

### Added
- PWA manifest (`public/manifest.json`) — standalone, portrait
- Service worker (`public/sw.js`) — cache-first assets, network-first API
- App icons: 192px, 512px, SVG
- Meta tags: `apple-mobile-web-app-capable`, `theme-color`, status bar style
- `.github/workflows/deploy.yml` — GitHub Actions auto-deploy to GitHub Pages
- `public/404.html` — SPA redirect safety net

### Changed
- **Architecture**: Server-rendered (LibSQL + Drizzle + Node adapter) → fully static (IndexedDB + Dexie)
- `astro.config.mjs` — `output: 'static'`, `base: '/macro-calorie-tracker'`
- All components migrated from `apiRequest()` to direct IndexedDB calls via `db-client.ts`
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