# Calorie Tracker Code Review

Checks run:
- `npm run test:run` ✅
- `npm run typecheck` ✅
- `npm run build` ✅

Passing checks does not save this app. Most of the problems are correctness, data integrity, UX, and implementation quality issues that static checks do not catch.

## 1. Bugs & Broken Functionality

1. **The “30 days / 90 days” weight chart is lying.**
   `src/pages/api/weight.ts:12-17` uses `LIMIT ?` on row count, not a date filter. If a user logs weight sporadically, the “30 days” view can easily show several months of data. The UI labels a time range, but the backend returns an entry count.

2. **Saved macro splits can render incorrectly as the default values.**
   `src/components/GoalsSettings.tsx:29-32` and `src/components/Dashboard.tsx:67-70` use `||` fallback logic. A valid saved value of `0` for any macro percentage is treated as falsy and replaced with `30/40/30`. The backend accepts `0` (`src/lib/validation.ts:55-57`), so the frontend can misrepresent persisted settings.

3. **Diary error messages are styled as success messages.**
   `src/components/Diary.tsx:202-205` decides whether a toast is “success” by checking whether the message ends with a period and does not contain a couple of hardcoded substrings. A validation error like `"Food name is required."` will be shown in the green success style.

4. **Date validation is fake.**
   `src/lib/validation.ts:8-10`, `src/lib/validation.ts:26-27`, and `src/lib/validation.ts:69-70` only enforce `YYYY-MM-DD` formatting. Impossible dates like `2026-02-31` pass validation and can be persisted. The code already has real date helpers in `src/lib/date.ts`, but the API layer does not use them.

5. **Nutrition details can display incorrect units.**
   `src/lib/open-food-facts.ts:38-56` stores raw Open Food Facts nutrient values without unit metadata or conversion. `src/components/NutritionDetail.tsx:88`, `:92-96`, `:164`, and `:182` then hardcode display units like `mg`, `mcg`, and `g`. That means the detail page can confidently show the wrong units.

6. **The “macro split” on the nutrition detail page is mathematically wrong.**
   `src/components/NutritionDetail.tsx:99-102` calculates percentages from grams of protein/carbs/fat, not calorie contribution. Calling that a macro split is misleading; fat calories are underweighted by design.

7. **“Full diary edit” is not actually full edit.**
   The PUT API supports editing calories, protein, carbs, fat, fiber, sugar, sodium, vitamins, and barcode (`src/pages/api/food-log.ts:91-114`), but the UI only exposes food name, brand, date, meal, servings, and serving size (`src/components/Diary.tsx:282-356`). Users cannot correct the nutrition data that drives totals.

8. **Delete endpoints silently succeed even when nothing was deleted.**
   `src/pages/api/food-log.ts:64-69` and `src/pages/api/weight.ts:40-45` always return `{ ok: true }` with no row-count check. The UI can report success for deleting an item that never existed.

## 2. Missing Features

Most of the headline spec items exist in some form. The problem is that several are only partially built.

1. **“Full diary view with edit/delete” is incomplete.**
   Delete exists. Edit exists. Full edit does not. The diary UI cannot edit the nutrition fields that actually matter for calorie and macro tracking (`src/components/Diary.tsx:282-356`).

2. **Nutrition detail is only available after logging, not during food selection.**
   The spec asked for nutrition detail per food item. There is a detail page for logged entries (`src/pages/food/[id].astro`), but the search flow has no way to inspect a food’s full nutrition before adding it (`src/components/FoodSearch.tsx`).

3. **Turso support is present at the connector level, but there is no real migration/story around it.**
   `src/lib/db.ts` creates tables on first request with ad hoc SQL. That is enough for a demo, not enough to call persistence properly finished. There is no migration versioning, no schema evolution path, and no operational separation between local SQLite and Turso.

## 3. Code Quality Issues

1. **The Open Food Facts integration is shoved into the browser.**
   `src/components/FoodSearch.tsx:63-78` fetches the third-party API directly from the client. No proxy, no caching, no timeout, no retry policy, no rate-limit shielding, no telemetry, no request cancellation via `AbortController`.

2. **API response typing is mostly wishful thinking.**
   `src/pages/api/food-log.ts`, `src/pages/api/goals.ts`, and `src/pages/api/weight.ts` return raw `db.execute(...).rows` values directly. `src/components/*` then trusts those shapes as `FoodLog`, `Goals`, and `WeightEntry` without runtime validation.

3. **The goals API contract is inconsistent with the declared frontend type.**
   `src/pages/api/goals.ts:12-15` can return an object without `id` or `updated_at`, while the frontend types `Goals` as requiring both (`src/lib/types.ts:21-28`). Static types are being used as decoration, not as a real contract.

4. **Database initialization happens in request flow.**
   `src/lib/db.ts:30-81` runs schema creation lazily on the first request. That is fine for a toy app, but it is a weak production pattern and it guarantees cold-start overhead on the first live request.

5. **A local SQLite database is committed in the repo.**
   `data/local.db` should not be source-controlled application state.

6. **Testing is shallow.**
   The test suite only covers helper functions in `src/lib/*.test.ts`. There are no component tests, no route tests, no integration tests for the CRUD flows, no tests for theme behavior, and no tests for the chart or diary editing paths.

7. **Light mode is implemented with brittle utility-class overrides.**
   `src/styles/global.css:69-93` hardcodes a handful of `.text-zinc-*`, `.bg-zinc-*`, and `.border-zinc-*` overrides. That approach is fragile and already misses many classes used throughout the app.

8. **The codebase is full of duplicated “messageFromError” helpers and hardcoded view logic.**
   The same helper is repeated in multiple components instead of being centralized. Success/error state inference is string-based in several places instead of status-based.

9. **The app has no real auth or user isolation.**
   The README admits this, and the code confirms it. All data lives in shared tables with no user scoping. Basic auth in `src/middleware.ts` is just a whole-app gate, not application auth.

10. **The mono font is referenced but never imported.**
   `src/styles/global.css:6` sets `JetBrains Mono`, but only Outfit is imported. The UI silently falls back.

## 4. UX Problems

1. **The theme system is inconsistent.**
   Dark mode is the real design target. Light mode is a patch job. Components still rely heavily on hardcoded zinc classes and dark-specific hover states, so the visual result will be inconsistent across pages.

2. **The fixed theme toggle competes with page content.**
   `src/layouts/AppLayout.astro:35` mounts a fixed button at the top-right on every screen. On mobile it sits on top of content instead of being integrated into navigation or page chrome.

3. **No delete confirmation anywhere.**
   Diary delete (`src/components/Diary.tsx:270-278`) and weight delete (`src/components/WeightTracker.tsx:318-326`) are one-tap destructive actions.

4. **The app overuses vague generic error text.**
   Most components collapse unknown failures into `"Something went wrong."` and do not give recovery guidance.

5. **The food search flow has no meaningful empty-state guidance before first input and no post-add navigation.**
   Users can add items, but there is no obvious shortcut back to the diary or dashboard after logging food. The flow feels unfinished.

6. **Success/error feedback is inconsistent between screens.**
   Food search, diary, goals, and weight each have their own message styling rules. They do not agree on what constitutes success vs failure.

7. **The mobile navigation is cramped for five tabs plus a floating theme toggle.**
   `src/components/MobileNav.tsx` uses tiny labels and fixed bottom chrome, while the top-right floating toggle consumes more space. It works, but it is not clean mobile UX.

## 5. Overall Score

**4/10**

This is a convincing demo, not a trustworthy calorie tracker. The AI that built it covered most of the requested screens, which is why it compiles and superficially looks complete, but the underlying implementation is sloppy: one of the chart ranges is objectively wrong, nutrition units are unreliable, diary editing is only half-built, API contracts are loose, and light mode is patched together with CSS overrides. It passes helper tests and ships pages, but it does not show the discipline you want in an app that records health-related data.
