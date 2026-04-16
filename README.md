# Macro Calorie Tracker

A mobile-first calorie and macro tracking PWA. Log meals, track weight, set goals — all offline-first with optional cloud sync.

**Live:** [jdelvo06-debug.github.io/macro-calorie-tracker](https://jdelvo06-debug.github.io/macro-calorie-tracker/)

## Features

- **Food search** — USDA FoodData Central + Open Food Facts (50+ common foods with real serving sizes)
- **Meal logging** — Breakfast, lunch, dinner, snack with date picker
- **Diary** — Grouped daily view with inline edit/delete
- **Weight tracker** — Chart with goal-weight overlay
- **Goals** — Calorie targets, macro splits (protein/carbs/fat)
- **Dashboard** — Calorie ring, macro progress, recent meals
- **PWA** — Installable on iOS/Android, works offline
- **Cloud sync** — Supabase backup (dual-write + pull on load)
- **Dark theme** — With light mode toggle

## Stack

- **Framework:** Astro (static output)
- **UI:** React + Tailwind CSS
- **Storage:** IndexedDB via Dexie (offline-first)
- **Cloud sync:** Supabase (fire-and-forget dual-write)
- **Food data:** USDA FoodData Central API + Open Food Facts API
- **Charts:** Chart.js
- **Hosting:** GitHub Pages (GitHub Actions auto-deploy)

## Architecture

```
Browser (IndexedDB) ←→ Supabase (cloud backup)
      ↑
  Food Search APIs (USDA + OFF)
```

- **Writes** go to IndexedDB first (instant, works offline), then async to Supabase
- **On load / online** — pulls latest from Supabase to keep devices in sync
- **No server** — fully static, no API routes

## Development

```sh
npm install

# Set env vars (or create .env)
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key

npm run dev
```

Runs at `http://localhost:4321`.

## Build & Deploy

Push to `main` → GitHub Actions builds and deploys to GitHub Pages automatically.

Manual workflow dispatch also available at [Actions](https://github.com/jdelvo06-debug/macro-calorie-tracker/actions).

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon/public key (safe for frontend) |

## Project Structure

```
src/
  components/    React UI components
  layouts/        Astro layouts (AppLayout with sync trigger)
  lib/            Core logic (db-client, food-search, supabase)
  pages/          Astro pages (index, log, diary, weight, goals, settings)
public/
  manifest.json   PWA manifest
  sw.js           Service worker
  icon-*.png      App icons
.github/
  workflows/
    deploy.yml    GitHub Actions deployment
```

## License

MIT