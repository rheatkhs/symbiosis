## Capability: database-layer

Drizzle ORM schema and connection layer for Neon PostgreSQL.

## Requirements

### DB-01: Drizzle Client Initialization
- The database client MUST be initialized in `src/db/index.ts`.
- The client MUST use `drizzle-orm/neon-http` driver with `@neondatabase/serverless`.
- Connection string MUST be read from `DATABASE_URL` environment variable.
- The module MUST fail fast with a clear error if `DATABASE_URL` is not set.

### DB-02: Schema Definition
- The schema MUST be defined in `src/db/schema.ts` using Drizzle's `pgTable` API.
- Three tables MUST be defined: `accounts`, `transfers`, `systemConfig`.
- All tables MUST use `uuid` primary keys with `defaultRandom()`.
- Timestamps MUST use `timestamp` type with `defaultNow()` where appropriate.
- The `transfers.account_id` column MUST have a foreign key reference to `accounts.id`.

### DB-03: Accounts Table
- Columns: `id` (uuid PK), `name` (varchar 255), `remoteName` (varchar 255, unique), `provider` (varchar 100), `status` (varchar 50, default 'active'), `storageUsed` (bigint, default 0), `storageLimit` (bigint, nullable), `createdAt` (timestamp), `updatedAt` (timestamp).
- `remoteName` MUST be unique across all accounts.

### DB-04: Transfers Table
- Columns: `id` (uuid PK), `accountId` (uuid FK → accounts.id), `fileName` (varchar 500), `filePath` (varchar 1000), `fileSize` (bigint), `status` (varchar 50, default 'pending'), `error` (text, nullable), `startedAt` (timestamp), `completedAt` (timestamp, nullable), `durationMs` (integer, nullable).
- An index MUST exist on `accountId` for efficient filtering.
- An index MUST exist on `status` for efficient filtering.
- An index MUST exist on `startedAt` for ordering.

### DB-05: System Config Table
- Columns: `key` (varchar 255 PK), `value` (text), `updatedAt` (timestamp).
- This is a simple key-value store for system-level settings.

### DB-06: Type Exports
- The schema file MUST export inferred TypeScript types using Drizzle's `$inferSelect` and `$inferInsert`.
- Types MUST be exported as: `Account`, `NewAccount`, `Transfer`, `NewTransfer`, `SystemConfig`, `NewSystemConfig`.
