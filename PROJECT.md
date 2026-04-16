# Project: Macro Calorie Tracker

> A mobile-first calorie/macro tracking PWA with offline-first IndexedDB storage and Supabase cloud sync.

## Quick Links

| Item | URL |
|------|-----|
| Live site | https://jdelvo06-debug.github.io/macro-calorie-tracker/ |
| Repo | https://github.com/jdelvo06-debug/macro-calorie-tracker |
| Supabase | https://gnxreojfvrzmgpmjxaql.supabase.co |
| Actions | https://github.com/jdelvo06-debug/macro-calorie-tracker/actions |
| Pages settings | https://github.com/jdelvo06-debug/macro-calorie-tracker/settings/pages |
| Secrets | https://github.com/jdelvo06-debug/macro-calorie-tracker/settings/secrets/actions |

## Tech Stack

- Astro (static) + React + Tailwind CSS
- IndexedDB (Dexie) — offline-first storage
- Supabase — cloud backup/sync (dual-write, no auth yet)
- USDA FoodData Central + Open Food Facts APIs
- GitHub Pages via GitHub Actions

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Storage | IndexedDB (Dexie) | Works offline, no server needed, fast local reads |
| Cloud sync | Supabase (dual-write) | Free tier, proper DB, scales to auth later |
| Hosting | GitHub Pages | Free, simple, Jeremy's preference |
| Food search | Client-side API calls | No server needed, USDA/OFF APIs are CORS-friendly |
| PWA | Standalone + portrait | Mobile-first app experience |
| Auth | None yet | Single-user, RLS with `true` policies |

## Supabase Schema

```sql
-- food_log: BIGSERIAL PK, stores per-entry nutrition
-- weight_entries: UNIQUE(date), daily weigh-ins
-- goals: id=1 only, single row for targets
```

Full schema: `supabase-schema.sql` in repo root.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db-client.ts` | IndexedDB CRUD + Supabase dual-write |
| `src/lib/supabase.ts` | Supabase client init |
| `src/lib/food-search-client.ts` | USDA + OFF search, serving size normalization |
| `src/lib/open-food-facts.ts` | Nutrient helpers, log payload builder |
| `src/layouts/AppLayout.astro` | Layout with sync-on-load trigger |
| `astro.config.mjs` | Static output, base path, env defines |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker |
| `.github/workflows/deploy.yml` | Auto-deploy workflow |

## TODO

- [ ] Polish serving display ("10x 10 kcal" → better format)
- [ ] Serving unit selector (servings / oz / grams)
- [ ] Export/import as data safety net
- [ ] Test PWA install on iPhone
- [ ] Add auth when multi-device becomes real

## History

- **2026-04-15**: Static migration, PWA, Supabase sync, serving size fix, GitHub Pages routing
- **2026-04-14**: Original build (LibSQL + Node adapter + basic auth)