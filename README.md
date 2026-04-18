# Macro Calorie Tracker

A mobile-first calorie and macro tracking PWA. Search USDA and Open Food Facts databases, scan barcodes, log meals, track weight, set goals — all offline-first with optional Supabase cloud sync.

**Live:** [jdelvo06-debug.github.io/macro-calorie-tracker](https://jdelvo06-debug.github.io/macro-calorie-tracker/)

---

## Features

### Food Logging
- **Dual-database search** — USDA FoodData Central + Open Food Facts (merged, deduped)
- **Barcode scanner** — Live camera scanning with Quagga2 (UPC-A, EAN-13, EAN-8) + photo upload fallback, with check-digit verification
- **Serving unit toggle** — Switch between ×servings, grams, or oz when logging
- **Smart serving sizes** — ~50 common foods auto-mapped to real portions (bacon=3 slices, chicken breast=1 breast, etc.)
- **Recent foods** — One-tap re-log from your history (deduped, most recent first)
- **Per-serving nutrition** — USDA results auto-converted from per-100g to per-serving

### Tracking
- **Dashboard** — Calorie progress ring, macro bars, today's meals by group
- **Diary** — Daily food log grouped by meal, inline edit/delete
- **Weight tracker** — Chart with goal-weight overlay
- **Goals** — Calorie target, macro split (protein/carbs/fat %), goal weight
- **Nutrition detail** — Full macro/micro breakdown per food item (available via Diary)

### Data
- **Offline-first** — IndexedDB stores everything locally, works without internet
- **Cloud sync** — Supabase dual-write (IndexedDB → cloud) + pull on load/online
- **Export/Import** — Download all data as JSON, import on any device
- **PWA** — Installable on iOS/Android, standalone mode, service worker caching

---

## Screenshots

| Page | Description |
|------|-------------|
| Dashboard | Calorie ring, macro progress, today's meals |
| Log Food | Search + Recent tabs, barcode scan, serving toggle |
| Diary | Grouped daily log, inline edit/delete |
| Weight | Chart with goal line, log entries |
| Goals | Calorie target, macro split sliders |
| Settings | Theme, weight unit, export/import |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Astro 6 (static output) | Build system, page routing, layouts |
| UI | React 19 + Tailwind CSS 4 | Interactive components, styling |
| Storage | IndexedDB (raw API) | Offline-first local data |
| Cloud sync | Supabase JS SDK | Backup, multi-device sync |
| Food data | USDA FDC API + Open Food Facts API | Nutrition database |
| Barcode | Quagga2 | Live 1D barcode scanning |
| Charts | Chart.js + react-chartjs-2 | Weight tracking graph |
| Validation | Zod | Schema validation |
| Testing | Vitest + coverage-v8 | Unit tests |
| Hosting | GitHub Pages | Free static hosting via Actions |

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Browser                     │
│                                              │
│  React Components (FoodSearch, Diary, etc.)  │
│         │              │                     │
│    IndexedDB      Supabase (async)           │
│    (primary)      (cloud backup)             │
│                                              │
│  Food Search APIs (USDA + OFF) ── direct     │
│  Barcode Scanner (Quagga2) ───── camera     │
└─────────────────────────────────────────────┘
         ↕
    GitHub Pages (static build)
```

**Data flow:**
1. **Writes** → IndexedDB (instant, offline-safe) → async Supabase push (fire-and-forget)
2. **Reads** → IndexedDB always
3. **Sync** → On page load + `online` event, pull latest from Supabase
4. **No server** — fully static, no API routes, no auth (single-user RLS)

---

## Project Structure

```
├── src/
│   ├── components/           # React UI components
│   │   ├── BarcodeScanner.tsx    # Quagga2 camera scanner + photo fallback
│   │   ├── Dashboard.tsx        # Home screen: calories, macros, meals
│   │   ├── DataManager.tsx      # Export/import in Settings
│   │   ├── Diary.tsx            # Daily food log, inline edit/delete
│   │   ├── ErrorBoundary.tsx    # React error boundary wrapper
│   │   ├── FoodSearch.tsx       # Search, Recent tabs, serving toggle, scan
│   │   ├── GoalsSettings.tsx    # Calorie + macro goal configuration
│   │   ├── MacroBar.tsx         # Protein/carbs/fat progress bars
│   │   ├── MobileNav.tsx         # Bottom tab bar
│   │   ├── ProgressRing.tsx     # Calorie ring component
│   │   ├── ThemeToggle.tsx      # Dark/light toggle
│   │   ├── WeightTracker.tsx    # Weight chart + log
│   │   └── DesktopSidebar.astro # Desktop nav sidebar
│   ├── layouts/
│   │   └── AppLayout.astro       # Shared layout, triggers cloud sync
│   ├── lib/                   # Core logic
│   │   ├── db-client.ts          # IndexedDB CRUD + Supabase dual-write + types
│   │   ├── food-search-client.ts # USDA + OFF search, serving normalization
│   │   ├── open-food-facts.ts    # Nutrient helpers, log payload builder
│   │   ├── supabase.ts           # Supabase client init
│   │   ├── types.ts              # MealType, MEAL_LABELS, MEAL_ORDER
│   │   ├── date.ts               # Date formatting helpers
│   │   └── validation.ts         # Zod schemas, type guards
│   ├── pages/                 # Astro pages (route → component)
│   │   ├── index.astro           # Dashboard
│   │   ├── log.astro             # Food search + logging
│   │   ├── diary.astro           # Daily food diary
│   │   ├── weight.astro          # Weight tracker
│   │   ├── goals.astro            # Goal settings
│   │   └── settings.astro        # Theme, units, export/import
│   └── styles/
│       └── global.css            # Tailwind + custom CSS vars
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service worker
│   ├── icon-*.png/svg         # App icons
│   └── 404.html              # SPA redirect fallback
├── .github/workflows/
│   └── deploy.yml             # GitHub Actions auto-deploy
├── supabase-schema.sql        # Cloud DB schema
├── CLAUDE.md                  # AI coding agent guidelines
└── astro.config.mjs           # Astro config (static, base path)
```

---

## Development

### Prerequisites
- Node.js ≥ 22.12
- npm

### Setup

```bash
git clone https://github.com/jdelvo06-debug/macro-calorie-tracker.git
cd macro-calorie-tracker
npm install
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anon key (safe for frontend, RLS enforced) |
| `USDA_FDC_API_KEY` | Yes | USDA FoodData Central API key (injected at build time) |

```bash
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key

npm run dev
```

Runs at `http://localhost:4321/macro-calorie-tracker/`.

### Commands

```bash
npm run dev          # Dev server with HMR
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run typecheck    # TypeScript checking
npm run test         # Vitest in watch mode
npm run test:run     # Vitest single run
npm run test:coverage # Coverage report
```

---

## Build & Deploy

Push to `main` → GitHub Actions builds and deploys to GitHub Pages automatically.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Passed at build time for env substitution |
| `SUPABASE_ANON_KEY` | Passed at build time for env substitution |
| `USDA_FDC_API_KEY` | Passed at build time for env substitution |

### GitHub Pages Setup
1. Go to repo Settings → Pages
2. Source: **GitHub Actions**
3. Push to `main` — workflow handles the rest

---

## Supabase Schema

See `supabase-schema.sql` for the full DDL.

| Table | PK | Notes |
|-------|----|-------|
| `food_log` | `BIGSERIAL` | Per-entry nutrition, keyed by date + meal_type |
| `weight_entries` | `BIGSERIAL` | `UNIQUE(date)` — one weigh-in per day |
| `goals` | `id=1` | Single row for calorie/macro targets |

RLS policies: `USING (true)` / `WITH CHECK (true)` — open access (no auth yet, single-user app).

---

## API Reference

### Food Search (client-side)

| Function | Source | Description |
|----------|--------|-------------|
| `searchFoods(query)` | `food-search-client.ts` | Combined USDA + OFF search, deduped |
| `lookupBarcode(barcode)` | `food-search-client.ts` | OFF barcode lookup by code |
| `toFoodLogPayload(product, ctx, override?)` | `open-food-facts.ts` | Convert SearchResult → FoodLogEntry, optional nutrition override |
| `getServingSize(product)` | `open-food-facts.ts` | Get human-readable serving size |

### Data Layer

| Function | File | Description |
|----------|------|-------------|
| `getFoodLogs(date)` | `db-client.ts` | Get all logs for a date |
| `addFoodLog(entry)` | `db-client.ts` | Add + sync to cloud |
| `updateFoodLog(entry)` | `db-client.ts` | Update + sync |
| `deleteFoodLog(id)` | `db-client.ts` | Delete + sync |
| `getRecentFoods(limit)` | `db-client.ts` | Distinct recent foods |
| `syncFromCloud()` | `db-client.ts` | Pull all from Supabase |

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| IndexedDB over localStorage | Raw IDB API | Structured data, indexes, more capacity |
| No Dexie/ORM | Manual transactions | Fine-grained control, smaller bundle |
| Supabase dual-write | Fire-and-forget | Local-first guarantees, cloud is best-effort backup |
| Client-side API calls | Direct USDA/OFF | Both APIs are CORS-friendly, no server proxy needed |
| Quagga2 over html5-qrcode | Purpose-built | 1D barcode focus, better UPC/EAN detection |
| Static output | No server | GitHub Pages, zero cost, offline-capable |
| No auth yet | RLS open | Single-user app, auth can be added later |
| GitHub Pages over Vercel | Preference | Simpler, free, integrated with repo |

---

## Known Issues

- Live barcode scanning may be slow on older iOS devices — photo upload fallback is reliable
- Supabase sync is cloud-wins on conflict (no merge) — fine for single-user, but offline-only entries can be overwritten by cloud data
- USDA search returns per-100g; common serving table covers ~50 foods, others default to 100g
- Service worker cache requires manual `CACHE_NAME` bump on each deploy

---

## License

MIT