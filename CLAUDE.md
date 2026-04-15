# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```sh
npm run dev            # Astro dev server at http://localhost:4321
npm run build          # Production build (Node adapter, server output)
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

### Astro + React islands
Pages under `src/pages/*.astro` are static shells that mount React components as islands (`client:load`). All interactive state lives in React; Astro only provides routing, the layout (`src/layouts/AppLayout.astro`), and server-rendered API routes under `src/pages/api/*.ts`. Dynamic routes like `src/pages/food/[id].astro` read the param and pass it into a React component.

### Server / client data flow
The React components never talk to `@libsql/client` directly. They always go through `apiRequest<T>()` (in `src/lib/api.ts`), which wraps `fetch` and throws `ApiRequestError` on non-2xx. The API routes themselves are thin: validate input via Zod → run parameterized SQL → return JSON. Every API route calls `ensureDB()` first; schema creation is lazy on first request (see "gotchas" below).

### Validation is the contract
`src/lib/validation.ts` is the single source of truth for what the API accepts. Key points:
- All numeric payloads pass through `nutritionNumberSchema` (finite, ≥0, ≤100000).
- `dateKeySchema` enforces both `YYYY-MM-DD` format **and** a real calendar date via `isDateKey()` from `src/lib/date.ts` — do not reintroduce regex-only date validation.
- `mergeFoodLogUpdate(existing, update)` merges a partial PUT payload. Nullable fields (`fiber`, `sugar`, `sodium`, `vitamins`, `barcode`) use explicit `=== undefined` checks so that passing `null` actually clears the field. Do not switch these to `??`.
- Goals require `protein_pct + carbs_pct + fat_pct === 100` via a `superRefine`.

When reading goals in components, use `??` (not `||`) for defaults — a saved `0%` macro is a valid value that `||` would silently replace.

### Dates
`src/lib/date.ts` owns date handling. The canonical key is `YYYY-MM-DD` built via `Intl.DateTimeFormat("en-CA", …)` to avoid timezone drift. Use `toDateKey()`, `parseDateKey()`, `addDays()`, `isDateKey()`, and `toFriendlyDate()` instead of raw `new Date(string)` / `toISOString()` calls.

### Database
`src/lib/db.ts` picks between local SQLite (`file:./data/local.db`) and Turso based on `DB_MODE`. Both modes use `@libsql/client`. `drizzle-orm` is in `package.json` but unused — queries are raw parameterized SQL. The schema is three tables: `food_logs`, `weight_entries`, `goals` (goals uses a `CHECK(id = 1)` singleton row seeded via `INSERT OR IGNORE`).

Delete endpoints (`DELETE /api/food-log`, `DELETE /api/weight`) check `rowsAffected` and return 404 if the target row didn't exist — keep this behavior when adding new delete routes.

### Auth
`src/middleware.ts` gates the entire app with HTTP Basic auth when `APP_BASIC_AUTH_USERNAME` and `APP_BASIC_AUTH_PASSWORD` are set. In production, if neither is set and `ALLOW_PUBLIC_DEMO !== "true"`, it fails closed with 503. Comparison uses a constant-time `safeEquals` (no early length-based return) in `src/lib/basic-auth.ts`. This is app-wide gating, not per-user auth — the app has no user model and all rows live in shared tables.

### Theming
`data-theme` attribute on `<html>` switches dark/light, persisted to `localStorage` by `ThemeToggle.tsx`. `src/styles/global.css` handles the override via Tailwind theme variables plus a handful of `!important` zinc-class overrides for light mode. Light mode is known to be a patch job — many hardcoded `zinc-*` classes and SVG/Chart.js hex colors don't invert. Do not expand the `!important` override list further; prefer driving colors via CSS variables on `:root` / `[data-theme="light"]`.

### Shared helpers worth knowing
- `messageFromError(error)` from `src/lib/api.ts` — single source of error-message extraction. Do not re-inline this helper in components.
- Action/toast state in components uses `{ text: string; isError: boolean } | null` — do NOT use string heuristics (suffix checks, keyword matches) to decide success vs. error styling.
- `src/lib/open-food-facts.ts` normalizes Open Food Facts `SearchResult` payloads into `FoodLog` payloads. Nutrient values come from `*_serving` fields when present, falling back to `*_100g`. The Open Food Facts search is called directly from the browser in `FoodSearch.tsx` — there is no server proxy.

## Gotchas

- **`ensureDB()` runs on every first request.** It's idempotent (all DDL is `IF NOT EXISTS`) but causes first-hit latency. Do not guard tables behind a different path — add new tables to the `batch()` call in `src/lib/db.ts`.
- **`prerender = false`** on every API route. Astro would otherwise try to prerender them under the Node adapter with server output.
- **Weight API uses date windows, not row limits.** `GET /api/weight?days=30` filters `date >= date('now', '-30 days')`. Do not regress to `LIMIT ?`.
- **Macro split on nutrition detail is calorie-weighted**, not gram-weighted (protein/carbs × 4, fat × 9). Keep this when editing `NutritionDetail.tsx`.
- **No per-user data isolation.** The README is explicit that this is a single-user demo. Do not build features that assume user scoping without adding auth + user FKs first.

## Tests

Vitest runs in Node env against `src/lib/*.test.ts`. Coverage is helper-level only — there are no component, route, or integration tests. When changing validation, date, basic-auth, or open-food-facts helpers, update the adjacent `.test.ts`.
