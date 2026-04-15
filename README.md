# Calorie Tracker

Calorie and macro tracking web app built with Astro, React, Tailwind CSS, and SQLite/Turso persistence.

## Features

- Dashboard with calorie ring and macro progress bars
- Food search powered by Open Food Facts
- Diary grouped by breakfast, lunch, dinner, and snack
- Inline diary editing and deletion
- Nutrition detail view per logged item
- Weight tracker with chart and goal-weight overlay
- Goals page for calorie targets and macro split
- Mobile bottom navigation and desktop sidebar
- Theme toggle with persisted preference

## Stack

- Astro + React
- Tailwind CSS
- `@libsql/client` for SQLite/Turso access
- Chart.js
- Vitest for unit tests

## Persistence modes

The app now uses an explicit database mode:

- `DB_MODE=local` uses `data/local.db`
- `DB_MODE=turso` requires both `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`

If `DB_MODE` is omitted, the app defaults to `local`.

## Environment

Create a `.env` file if you need non-default settings:

```env
SITE_URL=https://your-domain.example
DB_MODE=local

# Optional app-wide basic auth for private deployments
APP_BASIC_AUTH_USERNAME=demo
APP_BASIC_AUTH_PASSWORD=change-me

# Only set this if you intentionally want a public, unauthenticated production demo
ALLOW_PUBLIC_DEMO=false

# Turso mode
TURSO_DATABASE_URL=libsql://your-db.turso.io
TURSO_AUTH_TOKEN=your-token
```

## Development

```sh
npm install
npm run dev
```

The app runs at `http://localhost:4321` by default.

## Checks

```sh
npm run test:run
npm run typecheck
npm run build
```

## Deployment notes

- Set `SITE_URL` in production so sitemap output uses the real domain.
- Set `APP_BASIC_AUTH_USERNAME` and `APP_BASIC_AUTH_PASSWORD` if you want an app-wide login wall in front of the entire site.
- Production builds fail closed at request time unless auth is configured or `ALLOW_PUBLIC_DEMO=true`.
- This codebase is still a single-user demo app. It does **not** include per-user data isolation.
- Do not deploy it as a shared multi-user product without adding real auth and user-scoped data access.
