## Capability: dashboard-api

Hono API routes serving dashboard data to the frontend SPA.

## Requirements

### API-01: Route Prefix
- All dashboard API routes MUST be mounted under `/api/dash/`.
- Routes MUST return JSON responses with consistent structure.
- Error responses MUST follow the format: `{ error: string, details?: string }`.

### API-02: Stats Endpoint
- `GET /api/dash/stats` MUST return:
  ```json
  {
    "totalAccounts": number,
    "activeTransfers": number,
    "completedTransfers": number,
    "failedTransfers": number,
    "totalStorageUsed": number,
    "rcloneHealthy": boolean
  }
  ```
- Stats MUST be aggregated from the database with a single query where possible.

### API-03: Accounts CRUD
- `GET /api/dash/accounts` — List all accounts, ordered by `created_at` descending.
- `POST /api/dash/accounts` — Create account. Required body: `{ name, remoteName, provider }`. Optional: `{ storageLimit }`.
- `GET /api/dash/accounts/:id` — Get single account by UUID.
- `PUT /api/dash/accounts/:id` — Update account fields. Body contains only fields to update.
- `DELETE /api/dash/accounts/:id` — Soft-delete or hard-delete account. Returns 204 on success.
- All mutations MUST validate input and return 400 with specific error messages on invalid data.

### API-04: Transfers Endpoints
- `GET /api/dash/transfers` — List transfers with query params:
  - `page` (default: 1), `limit` (default: 20, max: 100)
  - `status` (optional filter: pending, streaming, completed, failed)
  - `accountId` (optional filter)
  - `from`, `to` (optional date range filter, ISO 8601)
- Response MUST include pagination metadata: `{ data: Transfer[], total: number, page: number, limit: number }`.
- `GET /api/dash/transfers/:id` — Get single transfer by UUID.

### API-05: Input Validation
- UUID parameters MUST be validated as proper UUIDs.
- String fields MUST be trimmed and checked for empty values.
- `remoteName` MUST be validated against path traversal patterns.
- Pagination `limit` MUST be clamped between 1 and 100.

### API-06: Transfer Logging Integration
- When a streaming upload starts (existing upload route), a transfer record MUST be created in the database with status `streaming`.
- When a streaming upload completes, the transfer record MUST be updated to `completed` with duration.
- When a streaming upload fails, the transfer record MUST be updated to `failed` with error message.
