## Why

The Symbiosis Stream Engine backend is operational but has no management interface. Operators need a dashboard to monitor streaming uploads, manage Rclone remotes/accounts, view transfer history, and check system health — all from a browser. Without a frontend, the only way to interact is via raw cURL commands, which is untenable for daily operations.

## What Changes

- Create a **React SPA dashboard** inside a `dashboard/` directory using **TanStack Router** (file-based routing) + **TanStack Query** for data fetching, built with **Vite** and **Bun**.
- Integrate **Neon PostgreSQL** via **Drizzle ORM** for persistent storage of accounts, transfer logs, and system configuration.
- Extend the existing Hono backend with new **API routes** for the dashboard (accounts CRUD, transfer history, stats).
- Add a **Drizzle schema** defining accounts, transfers, and system config tables.
- Add **drizzle-kit** for database migrations.

## Capabilities

### New Capabilities
- `dashboard-spa`: React single-page application with TanStack Router (file-based), TanStack Query, and premium dark-mode UI for managing the stream engine.
- `dashboard-api`: Hono API routes serving dashboard data — accounts CRUD, transfer history, stats aggregation, and system health.
- `database-layer`: Drizzle ORM schema and connection layer for Neon PostgreSQL, with tables for accounts, transfers, and system configuration.
- `database-migrations`: Drizzle-kit configuration and migration workflow for schema evolution.

### Modified Capabilities
- `server-config`: The backend's `package.json`, app routes, and server config will be extended to include Drizzle dependencies and new dashboard API routes.

## Impact

- **New directory**: `dashboard/` — standalone Vite+React SPA project (its own `package.json`).
- **Backend extensions**: New files under `src/routes/`, `src/db/`, and updated `src/app.ts`.
- **New dependencies (backend)**: `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`.
- **New dependencies (dashboard)**: `react`, `react-dom`, `@tanstack/react-router`, `@tanstack/react-query`, `@tanstack/router-plugin`, `vite`.
- **Environment**: Requires `DATABASE_URL` env var pointing to a Neon PostgreSQL connection string.
- **Build**: Dashboard builds to `dashboard/dist/` which can be served statically or proxied.
