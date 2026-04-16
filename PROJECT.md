# Project: Macro Calorie Tracker

> Mobile-first calorie/macro tracking PWA — offline-first IndexedDB + Supabase cloud sync.

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

- Astro 6 (static) + React 19 + Tailwind CSS 4
- IndexedDB (raw API) — offline-first storage
- Supabase JS SDK — cloud backup/sync (dual-write, no auth yet)
- USDA FoodData Central + Open Food Facts APIs (client-side)
- Quagga2 — 1D barcode scanning (UPC/EAN)
- Chart.js — weight tracking graph
- GitHub Pages via GitHub Actions

## Architecture Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Storage | IndexedDB (raw API) | Works offline, no server needed, fast local reads |
| Cloud sync | Supabase dual-write | Free tier, real DB, scales to auth later |
| Hosting | GitHub Pages | Free, simple, Jeremy's preference |
| Food search | Client-side API calls | Both USDA/OFF are CORS-friendly |
| Barcode | Quagga2 (not html5-qrcode) | Purpose-built for 1D barcodes, better UPC/EAN |
| Serving toggle | servings / grams / oz | Users think in different units for different foods |
| PWA | Standalone + portrait | Mobile-first app experience |
| Auth | None yet | Single-user, RLS with `true` policies |

## Supabase Schema

| Table | PK | Notes |
|-------|----|-------|
| `food_log` | `BIGSERIAL` | Per-entry nutrition, date + meal_type |
| `weight_entries` | `BIGSERIAL` | `UNIQUE(date)` — one per day |
| `goals` | `id=1` | Single row for targets |

Full DDL: `supabase-schema.sql`

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/db-client.ts` | IndexedDB CRUD + Supabase dual-write + recent foods |
| `src/lib/food-search-client.ts` | USDA + OFF search, serving normalization, barcode lookup |
| `src/lib/open-food-facts.ts` | Nutrient helpers, log payload builder |
| `src/lib/supabase.ts` | Supabase client init |
| `src/lib/types.ts` | TypeScript interfaces, MealType, meal labels |
| `src/components/FoodSearch.tsx` | Search + Recent tabs, serving toggle, barcode scan trigger |
| `src/components/BarcodeScanner.tsx` | Quagga2 live scan + photo upload fallback |
| `src/components/Dashboard.tsx` | Home: calorie ring, macro bars, today's meals |
| `src/components/Diary.tsx` | Daily log grouped by meal, inline edit/delete |
| `src/components/DataManager.tsx` | Export/import JSON in Settings |
| `src/layouts/AppLayout.astro` | Shared layout, sync-on-load trigger |
| `astro.config.mjs` | Static output, base path, env defines |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker |
| `.github/workflows/deploy.yml` | Auto-deploy workflow |

## Current Status

### ✅ Shipped (2026-04-15)
- Static migration (LibSQL → IndexedDB)
- PWA manifest + service worker
- Supabase cloud sync (dual-write + pull)
- USDA per-serving conversion (50+ common foods)
- GitHub Pages routing fix (base path)
- Serving display polish (no more "10x 10 kcal")
- Recent foods tab (deduped, one-tap re-log)
- Export/import (JSON backup in Settings)
- Barcode scanner (Quagga2, live + photo)
- Serving unit toggle (servings / grams / oz)
- Scanner polish (check digits, 2-read confirm, vignette)

### 🔲 Backlog
- [ ] PWA install test on iPhone
- [ ] Auth (Supabase auth when multi-device is real)
- [ ] Conflict resolution for Supabase sync
- [ ] Dark/light theme consistency in React components
- [ ] Serving size editing after logging
- [ ] Nutrition detail view (tap food in Diary for full breakdown)
- [ ] Barcode: test photo upload fallback on iOS
- [ ] Accessibility audit (ARIA, focus management)

## History

- **2026-04-15**: Feature sprint — barcode scanner, serving toggle, recent foods, export/import, scanner polish
- **2026-04-15**: Static migration, PWA, Supabase sync, serving size fix, GitHub Pages routing
- **2026-04-14**: Original build (LibSQL + Node adapter + basic auth) — see `_archive/`