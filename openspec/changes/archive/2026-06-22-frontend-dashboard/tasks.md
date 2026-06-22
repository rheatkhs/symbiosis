## Tasks

Implementation tasks for the Symbiosis Dashboard. Execute in order — backend data layer first, then API, then frontend.

---

### Task 1: Backend Dependencies & Database Config
**Files:** `package.json`, `drizzle.config.ts`, `src/db/index.ts`
**Specs:** DB-01, MIG-01, MIG-04

- [x] Add dependencies to root `package.json`: `drizzle-orm`, `@neondatabase/serverless`
- [x] Add dev dependencies: `drizzle-kit`
- [x] Add scripts: `db:generate`, `db:push`, `db:studio`
- [x] Create `drizzle.config.ts` with Neon PostgreSQL config
- [x] Create `src/db/index.ts` — Drizzle client with `neon-http` driver
- [x] Run `bun install` to verify

---

### Task 2: Database Schema
**Files:** `src/db/schema.ts`
**Specs:** DB-02 through DB-06

- [x] Define `accounts` table with all columns and constraints
- [x] Define `transfers` table with foreign key and indexes
- [x] Define `systemConfig` table
- [x] Export inferred types: `Account`, `NewAccount`, `Transfer`, `NewTransfer`, etc.
- [x] Run `bunx drizzle-kit generate` to verify schema validity

---

### Task 3: Dashboard API Routes
**Files:** `src/routes/dashboard.ts`, `src/app.ts`
**Specs:** API-01 through API-05

- [x] Create `src/routes/dashboard.ts` with Hono router
- [x] Implement `GET /stats` — aggregated dashboard statistics
- [x] Implement accounts CRUD: `GET/POST /accounts`, `GET/PUT/DELETE /accounts/:id`
- [x] Implement transfers listing: `GET /transfers` with pagination and filters
- [x] Implement `GET /transfers/:id` — single transfer detail
- [x] Add input validation for all endpoints
- [x] Mount dashboard routes at `/api/dash` in `src/app.ts`

---

### Task 4: Transfer Logging Integration
**Files:** `src/routes/stream.ts`
**Specs:** API-06

- [x] On upload start: create transfer record with status `streaming`
- [x] On upload success: update transfer to `completed` with duration
- [x] On upload failure: update transfer to `failed` with error message

---

### Task 5: Dashboard SPA Scaffolding
**Files:** `dashboard/package.json`, `dashboard/tsconfig.json`, `dashboard/vite.config.ts`, `dashboard/uno.config.ts`, `dashboard/index.html`
**Specs:** SPA-01, SPA-02

- [x] Create `dashboard/` directory with `package.json`
  - Dependencies: `react`, `react-dom`, `@tanstack/react-router`, `@tanstack/react-query`
  - Dev deps: `@vitejs/plugin-react`, `@tanstack/router-plugin`, `vite`, `unocss`, `@unocss/vite`, `@unocss/preset-uno`, `@unocss/preset-icons`, `@unocss/preset-web-fonts`, `@types/react`, `@types/react-dom`, `typescript`
- [x] Create `dashboard/tsconfig.json` for React + Vite
- [x] Create `dashboard/vite.config.ts` with TanStack Router plugin, UnoCSS plugin, and API proxy
- [x] Create `dashboard/uno.config.ts` with presets for Uno, Icons (like iconify), and Google Web Fonts
- [x] Create `dashboard/index.html` entry HTML
- [x] Run `bun install` in `dashboard/` to verify

---

### Task 6: Dashboard Root Layout & Router Setup
**Files:** `dashboard/src/main.tsx`, `dashboard/src/routes/__root.tsx`, `dashboard/src/styles/globals.css`
**Specs:** SPA-02, SPA-03, SPA-04

- [x] Create `dashboard/src/main.tsx` — React root with RouterProvider + QueryClientProvider, and import `virtual:uno.css`
- [x] Create `dashboard/src/styles/globals.css` — base CSS reset and custom dark theme variable definitions
- [x] Create `dashboard/src/routes/__root.tsx` — root layout with sidebar navigation and top bar
- [x] Create `dashboard/src/components/Sidebar.tsx` — navigation sidebar component
- [x] Create `dashboard/src/lib/api.ts` — fetch wrapper for `/api/dash/*` endpoints

---

### Task 7: Dashboard Overview Page
**Files:** `dashboard/src/routes/index.tsx`, `dashboard/src/components/StatCard.tsx`
**Specs:** SPA-05

- [x] Create `StatCard` component with glassmorphism styling
- [x] Create overview page with 4 stat cards
- [x] Add recent transfers table (last 10)
- [x] Add quick upload dropzone
- [x] Wire up TanStack Query hooks for stats and recent transfers

---

### Task 8: Accounts Page
**Files:** `dashboard/src/routes/accounts.tsx`, `dashboard/src/components/AccountCard.tsx`
**Specs:** SPA-06

- [x] Create `AccountCard` component with storage usage bar and status badge
- [x] Create accounts page with responsive grid layout
- [x] Add create account modal/dialog
- [x] Add edit and delete functionality
- [x] Wire up TanStack Query mutations for CRUD operations

---

### Task 9: Uploads Page
**Files:** `dashboard/src/routes/uploads.tsx`, `dashboard/src/components/TransferTable.tsx`
**Specs:** SPA-07

- [x] Create `TransferTable` component with sortable columns
- [x] Create uploads page with filters (status, account, date range)
- [x] Add pagination controls
- [x] Add polling for active transfers (5-second interval)
- [x] Wire up TanStack Query with pagination and filter state

---

### Task 10: Settings Page
**Files:** `dashboard/src/routes/settings.tsx`
**Specs:** SPA-08

- [x] Create settings page layout
- [x] Display Rclone daemon status with health indicator
- [x] Show server configuration info (port, max body size, uptime)
- [x] List configured Rclone remotes

---

### Task 11: Verification
- [x] Verify backend TypeScript: `bunx tsc --noEmit`
- [x] Verify dashboard TypeScript: `cd dashboard && bunx tsc --noEmit`
- [x] Start backend and dashboard dev servers
- [x] Test dashboard API endpoints via curl
- [x] Visual verification of dashboard pages in browser
