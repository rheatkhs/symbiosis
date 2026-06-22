## Capability: server-config

Bun server entrypoint configuration with overridden HTTP limits, Hono app binding, global error boundaries, and environment-driven Rclone connection settings.

## Requirements

### CFG-01: Bun Server Configuration
- The entrypoint MUST use `Bun.serve()` to start the HTTP server.
- `maxRequestBodySize` MUST be set to `5 * 1024 * 1024 * 1024` (5GB exactly).
- The server port MUST be read from `PORT` environment variable with a default of `3000`.
- The server MUST log a startup banner with the configured port and body size limit.

### CFG-02: Hono App Initialization
- The main app MUST be a `Hono` instance created in `src/app.ts`.
- The app MUST register global middleware in this order:
  1. Request ID generation (unique ID per request)
  2. Request timing/logging
  3. CORS with configurable allowed origins (from `CORS_ORIGIN` env, default `*`)
  4. Global error boundary
- The Hono `fetch` handler MUST be passed to `Bun.serve()` in `src/index.ts`.

### CFG-03: Rclone Connection Configuration
- Configuration MUST be loaded from environment variables:
  - `RCLONE_RC_HOST`: Rclone RC daemon host (default: `127.0.0.1`)
  - `RCLONE_RC_PORT`: Rclone RC daemon port (default: `5572`)
  - `RCLONE_RC_USER`: Optional username for Rclone RC auth
  - `RCLONE_RC_PASS`: Optional password for Rclone RC auth
- A `getRcloneBaseUrl()` helper MUST be exported returning `http://{host}:{port}`.
- The configuration module MUST export a typed `RcloneConfig` interface.

### CFG-04: Global Error Boundary
- Uncaught exceptions in route handlers MUST be caught by the global error boundary.
- Error responses MUST be structured JSON: `{ error: string, requestId?: string, timestamp: string }`.
- Stack traces MUST NOT be exposed in production (controlled by `NODE_ENV`).
- Errors MUST be logged to stderr with request context.

### CFG-05: Health Endpoint
- `GET /health` MUST return `200 OK` with:
  ```json
  { "status": "ok", "uptime": number, "rclone": { "healthy": boolean } }
  ```
- The health endpoint MUST check Rclone RC daemon connectivity.
- If Rclone RC is unreachable, the endpoint MUST still return 200 but with `rclone.healthy: false`.

### CFG-06: TypeScript Configuration
- `tsconfig.json` MUST target Bun's runtime (`"types": ["bun-types"]`).
- Module resolution MUST use `"bundler"` for Bun compatibility.
- Strict mode MUST be enabled.
- The configuration MUST support path aliases if needed.

### CFG-07: Package Configuration
- `package.json` MUST list `hono` and `@hono/body-limit` as dependencies.
- `bun-types` MUST be listed as a dev dependency.
- A `dev` script MUST be defined: `bun run --hot src/index.ts`.
- A `start` script MUST be defined: `bun run src/index.ts`.
