## Overview

The Symbiosis Dashboard is a premium dark-mode React SPA that provides a management interface for the Stream Engine. It's structured as a **monorepo-style** setup: the backend Hono server lives at the project root, while the dashboard is a standalone Vite+React app inside `dashboard/`. The backend exposes REST API routes that the dashboard consumes via TanStack Query, and persists data to Neon PostgreSQL via Drizzle ORM.

## Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│  Browser (Dashboard SPA)                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  React + TanStack Router (file-based) + TanStack Query       │  │
│  │  Pages: Dashboard / Accounts / Uploads / Settings            │  │
│  └──────────────────────────┬───────────────────────────────────┘  │
└─────────────────────────────┼─────────────────────────────────────┘
                              │ fetch /api/*
┌─────────────────────────────▼─────────────────────────────────────┐
│  Hono Backend (Bun)                                                │
│  ┌──────────┐  ┌──────────────┐  ┌─────────────┐                  │
│  │ /api/     │  │ /api/stream/ │  │ /api/dash/  │                  │
│  │ health    │  │ upload/      │  │ accounts/   │                  │
│  │           │  │              │  │ transfers/  │                  │
│  │           │  │              │  │ stats/      │                  │
│  └──────────┘  └──────────────┘  └──────┬──────┘                  │
│                                          │                         │
│  ┌───────────────────────────────────────▼──────────────────────┐  │
│  │  Drizzle ORM                                                  │  │
│  │  Schema: accounts, transfers, system_config                   │  │
│  └───────────────────────────────────────┬──────────────────────┘  │
└──────────────────────────────────────────┼────────────────────────┘
                                           │
                              ┌────────────▼────────────┐
                              │  Neon PostgreSQL         │
                              │  (Serverless)            │
                              └─────────────────────────┘
```

## Project Structure

```
symbiosis/
├── package.json                  # Backend (existing)
├── src/
│   ├── index.ts                  # Backend entrypoint (existing)
│   ├── app.ts                    # Hono app (MODIFIED — mount dashboard API)
│   ├── db/
│   │   ├── index.ts              # Drizzle client initialization
│   │   ├── schema.ts             # Drizzle table definitions
│   │   └── migrate.ts            # Migration runner helper
│   ├── routes/
│   │   ├── stream.ts             # Existing stream routes
│   │   └── dashboard.ts          # NEW — Dashboard REST API routes
│   └── services/
│       └── rcloneService.ts      # Existing
├── drizzle.config.ts             # Drizzle Kit config
├── drizzle/                      # Generated migration SQL files
│
└── dashboard/                    # Standalone Vite+React SPA
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    ├── uno.config.ts
    ├── index.html
    └── src/
        ├── main.tsx              # React root + RouterProvider
        ├── styles/
        │   └── globals.css       # Global base/reset styles and custom CSS variables
        ├── lib/
        │   └── api.ts            # Fetch wrapper for backend API
        ├── routes/
        │   ├── __root.tsx        # Root layout (sidebar + top bar)
        │   ├── index.tsx         # Dashboard overview page
        │   ├── accounts.tsx      # Account management page
        │   ├── uploads.tsx       # Upload history/active transfers
        │   └── settings.tsx      # System settings page
        └── components/
            ├── Sidebar.tsx
            ├── StatCard.tsx
            ├── AccountCard.tsx
            ├── TransferTable.tsx
            └── UploadDropzone.tsx
```

## Database Schema

### `accounts` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Auto-generated account ID |
| `name` | `varchar(255)` | Display name |
| `remote_name` | `varchar(255)` | Rclone remote identifier (e.g., `gdrive1`) |
| `provider` | `varchar(100)` | Cloud provider (google_drive, onedrive, etc.) |
| `status` | `varchar(50)` | active / paused / error |
| `storage_used` | `bigint` | Bytes used (synced periodically) |
| `storage_limit` | `bigint` | Max bytes allowed |
| `created_at` | `timestamp` | Account creation time |
| `updated_at` | `timestamp` | Last update time |

### `transfers` table
| Column | Type | Description |
|--------|------|-------------|
| `id` | `uuid` (PK) | Transfer ID |
| `account_id` | `uuid` (FK) | Reference to accounts |
| `file_name` | `varchar(500)` | Name of uploaded file |
| `file_path` | `varchar(1000)` | Remote destination path |
| `file_size` | `bigint` | Size in bytes |
| `status` | `varchar(50)` | pending / streaming / completed / failed |
| `error` | `text` | Error message if failed |
| `started_at` | `timestamp` | When the transfer started |
| `completed_at` | `timestamp` | When the transfer finished |
| `duration_ms` | `integer` | Duration in milliseconds |

### `system_config` table
| Column | Type | Description |
|--------|------|-------------|
| `key` | `varchar(255)` (PK) | Configuration key |
| `value` | `text` | Configuration value |
| `updated_at` | `timestamp` | Last update time |

## Dashboard API Design

All dashboard API routes are prefixed with `/api/dash/`.

| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/api/dash/stats` | Aggregated stats: total accounts, active transfers, total storage |
| `GET` | `/api/dash/accounts` | List all accounts |
| `POST` | `/api/dash/accounts` | Create a new account |
| `GET` | `/api/dash/accounts/:id` | Get account details |
| `PUT` | `/api/dash/accounts/:id` | Update account |
| `DELETE` | `/api/dash/accounts/:id` | Delete account |
| `GET` | `/api/dash/transfers` | List transfers with pagination + filtering |
| `GET` | `/api/dash/transfers/:id` | Get transfer details |

## Dashboard UI Design

### Visual Direction
- **Dark mode**: Deep charcoal base (`#0a0a0f`) with subtle blue-violet accents
- **Glassmorphism**: Cards with `backdrop-filter: blur()` and subtle borders
- **Typography**: Inter font family via Google Fonts
- **Micro-animations**: Smooth transitions on hover, page changes, and data updates (utilizing UnoCSS transitions)
- **Styling Method**: **UnoCSS** for utility-first styling with custom theme overrides.
- **Color palette**:
  - Background: `hsl(240, 20%, 4%)` → `hsl(240, 15%, 8%)`
  - Cards: `hsla(240, 15%, 12%, 0.6)` with glass effect
  - Primary accent: `hsl(250, 85%, 65%)` (violet)
  - Success: `hsl(150, 70%, 50%)`
  - Warning: `hsl(40, 90%, 55%)`
  - Error: `hsl(0, 80%, 60%)`
  - Text primary: `hsl(0, 0%, 95%)`
  - Text secondary: `hsl(240, 10%, 60%)`

### Pages

1. **Dashboard (/)** — Overview with stat cards (accounts, active transfers, total storage, health status), recent transfers table, and a quick upload dropzone
2. **Accounts (/accounts)** — Grid of account cards showing remote name, provider, storage used/limit, status badge. Create/edit modal.
3. **Uploads (/uploads)** — Full transfer history table with filters (status, account, date range), pagination, and real-time status updates via polling
4. **Settings (/settings)** — System configuration, Rclone daemon status, and environment info

## Technical Decisions

| Decision | Rationale |
|---|---|
| **Separate `dashboard/` directory** | Keeps frontend build isolated; Vite dev server proxies to backend |
| **TanStack Router file-based** | Type-safe, auto-generated route tree, clean code splitting |
| **TanStack Query** | Built-in caching, background refetching, optimistic updates |
| **Drizzle ORM + Neon** | Type-safe SQL, lightweight, native serverless PostgreSQL support |
| **`neon-http` driver** | Simpler than WebSocket for standard CRUD ops; no persistent connection needed |
| **UnoCSS** | Atomic CSS engine providing maximum speed, small bundle size, and easy customizations |
| **Vite proxy** | Dev server at `:5173` proxies `/api/*` to Bun at `:3000` — no CORS issues |
