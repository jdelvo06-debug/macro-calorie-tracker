# Frankenmerge Task — Calorie Tracker

You are working in the `best-of/` directory, which is a copy of the Claude (Opus) calorie tracker build. Your job is to merge the best features from the Codex and GLM builds into this codebase.

## Source Builds (read-only, do NOT modify):
- **Codex (GPT-5.4):** `~/Projects/model-wars/codex/`
- **GLM 5.1:** `~/Projects/model-wars/glm-5.1/`

## Current (working directory):
- **best-of:** `~/Projects/model-wars/best-of/` (Claude build as base)

## What to Merge

### From Codex (`~/Projects/model-wars/codex/`):
1. **USDA + OFF merged food search** — Copy `src/lib/food-search.ts` and `src/lib/usda-fdc.ts`. Update the existing `src/lib/open-food-facts.ts` and `src/components/FoodSearch.tsx` to use the merged `searchAllSources()` from `food-search.ts` instead of OFF-only search. The Codex version searches USDA first then OFF, deduplicates by normalized name, and falls back gracefully. Preserve the Claude build's FoodSearch.tsx UI but swap the search backend.

2. **Dark theme UI styling** — Look at Codex's `src/styles/global.css` and its page layouts. Merge the best CSS patterns (rounded-3xl cards, glassmorphism, dark theme) into the existing best-of styles. Don't replace — blend.

3. **Settings page** — Copy the concept from `src/pages/settings/index.astro`. Create a basic settings page.

### From GLM (`~/Projects/model-wars/glm-5.1/`):
1. **Drizzle ORM** — Copy `src/lib/schema.ts` and `drizzle.config.ts`. Adapt the Drizzle schema to match the Claude build's existing DB columns (they're slightly different). Update `src/lib/db.ts` to use Drizzle ORM for queries instead of raw SQL. Keep the `DB_MODE` toggle for local vs Turso. Install drizzle-orm and @libsql/client if not already present.

2. **CircularProgress SVG component** — Extract the inline `CircularProgress` from GLM's `Dashboard.tsx` into its own component file `src/components/CircularProgress.tsx`. Replace the existing `ProgressRing.tsx` usage or offer it as an alternative lightweight option (no Chart.js dependency).

### What NOT to change:
- Keep Claude's Zod validation layer (`src/lib/validation.ts`)
- Keep Claude's auth middleware (`src/lib/basic-auth.ts`)
- Keep Claude's test suite (`src/lib/*.test.ts`, `vitest.config.ts`)
- Keep Claude's `api.ts` client wrapper
- Keep Claude's date utility library
- Keep React islands architecture (don't convert to server-rendered MPA)
- Keep the DB mode toggle (local vs Turso)

### After merging:
1. Run `npm install` to pick up new dependencies
2. Run `npm run build` to verify it compiles
3. Run `npm run test:run` to verify tests still pass
4. Commit with message: "Frankenmerge: Claude base + Codex food search + GLM Drizzle ORM"

## Key File Locations (for reference):
- Claude (base): `~/Projects/model-wars/best-of/` (this is where you work)
- Codex source: `~/Projects/model-wars/codex/src/lib/food-search.ts`, `codex/src/lib/usda-fdc.ts`, `codex/src/lib/open-food-facts.ts`, `codex/src/pages/settings/`
- GLM source: `~/Projects/model-wars/glm-5.1/src/lib/schema.ts`, `glm-5.1/src/lib/queries.ts`, `glm-5.1/drizzle.config.ts`, `glm-5.1/src/components/Dashboard.tsx` (for CircularProgress)

## Important Notes:
- The Claude build uses `@libsql/client` directly for DB. Drizzle ORM (`drizzle-orm/libsql`) sits on top of the same client.
- The Claude build's `FoodSearch.tsx` calls OFF search directly. You need to update it to call the new merged `searchAllSources()` which searches both USDA and OFF.
- USDA search requires a `USDA_API_KEY` env var. Add it to `.env.example` but make it optional — the app should still work with OFF-only if no USDA key is set.
- The GLM build's Drizzle schema uses `snake_case` DB column names with `camelCase` TypeScript names. Keep the `snake_case` DB columns for compatibility with existing data, but match the TypeScript interface names to what the Claude build expects.