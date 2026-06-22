## Capability: database-migrations

Drizzle-kit configuration and migration workflow.

## Requirements

### MIG-01: Drizzle Kit Config
- A `drizzle.config.ts` MUST exist at the project root.
- It MUST specify `dialect: "postgresql"`, `schema: "./src/db/schema.ts"`, and `out: "./drizzle"`.
- Database credentials MUST be read from `DATABASE_URL` environment variable.

### MIG-02: Migration Generation
- Migrations MUST be generated via `bunx drizzle-kit generate`.
- Generated SQL files MUST be stored in the `drizzle/` directory.

### MIG-03: Migration Execution
- A migration runner helper MUST exist at `src/db/migrate.ts`.
- Migrations MUST be runnable via `bunx drizzle-kit push` for development.
- The migration runner MUST log which migrations were applied.

### MIG-04: Package Scripts
- `package.json` MUST include scripts:
  - `db:generate` — `bunx drizzle-kit generate`
  - `db:push` — `bunx drizzle-kit push`
  - `db:studio` — `bunx drizzle-kit studio`
