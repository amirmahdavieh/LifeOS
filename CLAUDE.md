# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚠️ Known broken state: `package.json` is missing `scripts` and `devDependencies`

The `package.json` at the repo root currently has **no `scripts` block and no `devDependencies` block**, even though `package-lock.json` and `node_modules` still contain them (vite, electron, electron-builder, concurrently, oxlint, typescript, @types/*). This means `npm run dev` / `npm run build` etc. do not currently work, despite `dev.cmd` and the `.claude/launch.json` "dev" config both invoking `npm run dev`.

Until `package.json` is repaired, use the underlying binaries directly (all already installed in `node_modules/.bin`):

- Frontend dev server: `npx vite` (serves on 5173, proxies `/api` to `http://localhost:3001` per `vite.config.ts`)
- API server standalone: `node server/index.js` (listens on `API_PORT` or 3001)
- Both together: run the two commands above in separate terminals, or use `npx concurrently "vite" "node server/index.js"`
- Electron shell (expects the Vite dev server already running on 5173): `npx electron .`
- Typecheck: `npx tsc -b`
- Lint: `npx oxlint`
- Production build: `npx tsc -b && npx vite build` (outputs to `dist/`, which `server/index.js` serves as static files when present)
- Package the Electron app: `npx electron-builder` (a `release/` build already exists from a prior run; no `build` config is currently present in `package.json`, so this will likely need one restored before it works)

If asked to fix this, restore `scripts` (dev/build/lint/etc.) and `devDependencies` to `package.json` from what's already resolved in `package-lock.json`'s root `""` package entry.

## Architecture

This is **LifeOS**, an Electron + React desktop app with two domains — a **Planner** (weekly task calendar) and **Finance** (daily spending + monthly subscriptions) — both backed by a local SQLite database via one shared Express API.

**Three runtime pieces, one shared server module:**

- `src/` — React 19 + TypeScript frontend (Vite).
- `server/index.js` — Express API (`server/db.js` for the schema). Can run standalone (`node server/index.js`) for browser-only dev, or be imported by Electron.
- `electron/main.js` — Electron main process. Imports `startServer()` from `server/index.js` directly (no separate HTTP hop at boot) and points the `BrowserWindow` at `http://localhost:<port>`. In production the same Express server also serves the built `dist/` static files and falls back to `index.html` for client-side routing (see the bottom of `server/index.js`).

**Stale duplicate files at repo root:** `main.js` and `db.js` in the repo root are earlier/leaner copies of `electron/main.js` and `server/db.js` respectively (they differ — e.g. root `db.js` lacks the `recurringId` column migration and the new `spending`/`subscriptions` tables, root `main.js` sets `DB_PATH` directly instead of letting `db.js` resolve an OS-standard app-data directory). `package.json`'s `"main"` field points at `electron/main.js`, so the root copies are not part of the active run path — don't edit them expecting effect; prefer deleting them if doing cleanup, or ask before assuming which is authoritative.

**Database location:** `server/db.js` resolves one consistent on-disk SQLite path (`%APPDATA%/weeklyplanner/tasks.db` on Windows, equivalent per-OS paths elsewhere) via `defaultDataDir()`, unless `DB_PATH` env var overrides it — this ensures the dev server, `electron .`, and the packaged app all read/write the same database (all three tables — `tasks`, `spending`, `subscriptions` — live in this one file). Uses Node's built-in `node:sqlite` (`DatabaseSync`), not a third-party driver.

### Frontend module structure

`src/App.tsx` is the top-level "LifeOS shell": it renders the `LifeOS` topbar (Planner / Finance tabs) and switches between the two domains, each self-contained:

- `src/planner/PlannerView.tsx` — the entire original Weekly Planner (unchanged behavior), pulling from `src/components/*`, `src/store/useTaskStore.ts`, `src/utils/*`, `src/types.ts`. These planner-internal files were deliberately **not** moved into `src/planner/` when Finance was added, to avoid any risk of regressing working planner code — only the App-level wiring changed.
- `src/finance/` — the entire Finance module, self-contained:
  - `FinanceApp.tsx` — Finance's own sub-nav (Overview / Spending / Subscriptions) and data loading (`loadAll()` on mount).
  - `store/useFinanceStore.ts` — Zustand store for both `spending` and `subscriptions` collections (mirrors `useTaskStore`'s fetch/optimistic-update pattern).
  - `components/Overview.tsx`, `SpendingView.tsx`, `SubscriptionsView.tsx` — the three tabs.
  - `components/SpendingModal.tsx`, `SubscriptionModal.tsx` — create/edit forms, reusing the shared `.modal`/`.field`/`.btn` classes from `App.css`.
  - `types.ts`, `constants.ts` (expense categories, payment methods), `utils.ts` (currency formatting, month filtering, category grouping, upcoming-payment calculation), `finance.css` (Finance-only layout classes).
  - All spending/subscription data is fetched once and filtered/aggregated client-side (same pattern as Planner fetching all tasks and filtering by week) — there's no server-side date-range filtering.

**Task model** (`src/types.ts`): a `Task` has `date` (`YYYY-MM-DD`), `startTime`/`endTime` (`HH:mm` 24h), optional `notes`/`category`/`color`, `completed`, and `recurringId`.

**Weekly recurrence:** creating a task with `repeatWeekly: true` generates a `recurringId` and backfills weekly occurrences up to `RECURRING_HORIZON_WEEKS` (52 weeks) ahead server-side (`server/index.js`). Every `GET /api/tasks` call also calls `refillRecurringSeries()` to top up any series that has fallen behind the horizon, so the horizon keeps extending as time passes without a cron job. Deleting a recurring task takes a `scope` query param (`one` | `future`) to delete just one occurrence or that occurrence and all later ones in the series.

**Drag/resize interaction model** (`src/components/WeekGrid.tsx`): task move/resize is implemented with raw `pointermove`/`pointerup` window listeners and a local `Interaction` state machine (not a drag-and-drop library), snapping to `SNAP_MINUTES` (15 min). `src/utils/layout.ts` does greedy interval-graph coloring to lay out same-day overlapping tasks into side-by-side columns.

**Finance model** (`src/finance/types.ts`): `Spending` has `amount`, `date` (`YYYY-MM-DD`), `category`, `merchant`, optional `notes`/`paymentMethod`. `Subscription` has `name`, `monthlyPrice`, `billingDate` (day-of-month integer 1–31, clamped to the actual days in short months when computing next occurrence), optional `category`/`notes`, and `active`. Only `active` subscriptions count toward monthly/yearly totals and upcoming-payment lists (`getUpcomingPayments` in `src/finance/utils.ts`).

**API contract:**
- `/api/tasks` — `GET`, `POST`, `PUT /:id`, `DELETE /:id?scope=` — see `server/index.js` for validation rules (e.g. `endTime` must be after `startTime`, enforced both client-side in `TaskModal.tsx` and server-side).
- `/api/spending` — `GET`, `POST`, `PUT /:id`, `DELETE /:id` — requires `amount` (positive number), `date`, `category`, `merchant`.
- `/api/subscriptions` — `GET`, `POST`, `PUT /:id`, `DELETE /:id` — requires `name`, `monthlyPrice` (≥ 0), `billingDate` (integer 1–31).

## Config notes

- `.oxlintrc.json` is the linter config (oxlint, not ESLint) — plugins: react, typescript, oxc.
- TypeScript is split via project references: `tsconfig.json` → `tsconfig.app.json` (src, bundler mode, no emit — Vite handles transpilation) and `tsconfig.node.json` (vite.config.ts only).
- Vite dev server proxies `/api/*` to `http://localhost:3001` (`vite.config.ts`) — the Express server must be running separately for `npx vite` alone to have working API calls.
