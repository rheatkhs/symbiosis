## Capability: dashboard-spa

React single-page application for managing the Symbiosis Stream Engine.

## Requirements

### SPA-01: Project Scaffolding
- The dashboard MUST be a standalone project in the `dashboard/` directory with its own `package.json`.
- The dashboard MUST use **Vite** as the build tool with `@vitejs/plugin-react` and `@unocss/vite`.
- The dashboard MUST use **Bun** as the package manager and runtime.
- The Vite dev server MUST proxy `/api/*` requests to `http://localhost:3000`.

### SPA-02: TanStack Router (File-Based)
- Routing MUST use `@tanstack/react-router` with the Vite plugin for file-based route generation.
- The router MUST use `autoCodeSplitting: true` for optimal bundle sizes.
- Route files MUST be placed in `dashboard/src/routes/` following TanStack's file naming conventions.
- The following routes MUST exist:
  - `/` — Dashboard overview
  - `/accounts` — Account management
  - `/uploads` — Transfer history
  - `/settings` — System settings

### SPA-03: TanStack Query Integration
- Data fetching MUST use `@tanstack/react-query` with a `QueryClientProvider` at the app root.
- API calls MUST be wrapped in custom hooks (e.g., `useAccounts`, `useTransfers`, `useStats`).
- Stale time MUST be configured to 30 seconds for dashboard stats and 60 seconds for account data.
- Transfer lists MUST poll every 5 seconds when there are active transfers.

### SPA-04: Dark Mode Premium UI
- The entire UI MUST use a dark color scheme with no light mode toggle (dark-only).
- Styling MUST be built primarily with utility-first classes via **UnoCSS**.
- Cards MUST use glassmorphism effects (`backdrop-filter: blur`, semi-transparent backgrounds).
- Typography MUST use the Inter font family (configured via UnoCSS web fonts or global CSS variables).
- All interactive elements MUST have hover/focus transitions (minimum 150ms ease).
- Page transitions MUST animate smoothly.
- Status badges MUST use color-coded indicators (green=active, yellow=pending, red=error).

### SPA-05: Dashboard Overview Page
- The overview page MUST display 4 stat cards: total accounts, active transfers, total storage used, system health.
- A recent transfers table MUST show the last 10 transfers with file name, account, status, and timestamp.
- A quick upload dropzone MUST allow drag-and-drop file upload to a selected account.

### SPA-06: Accounts Page
- MUST display accounts in a responsive grid of cards.
- Each card MUST show: name, remote name, provider icon/label, storage usage bar, status badge.
- MUST support creating new accounts via a modal/dialog.
- MUST support editing and deleting accounts.

### SPA-07: Uploads Page
- MUST display a paginated table of all transfers.
- MUST support filtering by status, account, and date range.
- Active transfers MUST show real-time progress via polling.
- MUST show file name, account, size, status, duration, and timestamps.

### SPA-08: Settings Page
- MUST display current Rclone daemon status (healthy/unhealthy) with latency.
- MUST show server uptime, configured port, and max body size.
- MUST list all configured Rclone remotes from the backend.
