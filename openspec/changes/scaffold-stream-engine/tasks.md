## Tasks

Implementation tasks for the Symbiosis Stream Engine scaffold. Execute in order — each task builds on the previous.

---

### Task 1: Project Foundation
**Files:** `package.json`, `tsconfig.json`
**Specs:** CFG-06, CFG-07

- [x] Create `package.json` with project name `symbiosis-stream-engine`
  - Dependencies: `hono`, `@hono/body-limit`
  - Dev dependencies: `bun-types`, `typescript`
  - Scripts: `dev` (`bun run --hot src/index.ts`), `start` (`bun run src/index.ts`)
- [x] Create `tsconfig.json` targeting Bun runtime
  - Types: `["bun-types"]`
  - Module resolution: `"bundler"`
  - Strict mode enabled
  - Target: `"ESNext"`, Module: `"ESNext"`
- [x] Run `bun install` to verify dependency resolution

---

### Task 2: Rclone Configuration Module
**Files:** `src/config/rclone.ts`
**Specs:** CFG-03

- [x] Create `src/config/rclone.ts` with typed `RcloneConfig` interface
- [x] Read environment variables: `RCLONE_RC_HOST`, `RCLONE_RC_PORT`, `RCLONE_RC_USER`, `RCLONE_RC_PASS`
- [x] Export `getRcloneBaseUrl()` helper returning `http://{host}:{port}`
- [x] Export default config object with validated values

---

### Task 3: Rclone RC Service Layer
**Files:** `src/services/rcloneService.ts`
**Specs:** RC-01 through RC-08

- [x] Create `RcloneService` class with constructor accepting config
- [x] Implement `checkHealth()` method calling `rc/noop`
- [x] Implement `streamUpload(stream, remotePath, fileName, accountId)` method
  - Construct request to `operations/uploadfile`
  - Pass `ReadableStream` as fetch body
  - Set `fs` and `remote` parameters
- [x] Implement `listRemotes()` calling `config/listremotes`
- [x] Implement `getTransferStatus(jobId)` calling `job/status`
- [x] Add error translation layer (Rclone errors → structured errors)
- [x] Add retry logic for transient failures (3 retries, exponential backoff)
- [x] Support optional HTTP Basic Auth from config

---

### Task 4: Streaming Upload Routes
**Files:** `src/routes/stream.ts`
**Specs:** STREAM-01 through STREAM-06

- [x] Create Hono router for stream routes
- [x] Implement `POST /api/stream/upload/:accountId`
  - Apply `bodyLimit` middleware at 5GB
  - Extract `c.req.raw.body` as raw `ReadableStream`
  - Validate required headers: `X-File-Path`, `X-File-Name`
  - Validate `accountId` against path traversal
  - Call `RcloneService.streamUpload()` with the stream
  - Return JSON success/error response
- [x] Handle abrupt client disconnection via AbortController
- [x] Add proper error responses for all failure cases (400, 413, 502, 503)

---

### Task 5: Hono App & Global Middleware
**Files:** `src/app.ts`
**Specs:** CFG-02, CFG-04, CFG-05

- [x] Create Hono instance in `src/app.ts`
- [x] Register middleware stack:
  - Request ID generation
  - Request timing/logging
  - CORS (configurable via `CORS_ORIGIN` env)
  - Global error boundary
- [x] Mount stream routes under `/api/stream`
- [x] Implement `GET /health` endpoint
  - Check Rclone RC connectivity
  - Return uptime, status, and rclone health
- [x] Implement global error boundary
  - Structured JSON error responses
  - No stack traces in production

---

### Task 6: Bun Server Entrypoint
**Files:** `src/index.ts`
**Specs:** CFG-01

- [x] Create `src/index.ts` with `Bun.serve()`
- [x] Set `maxRequestBodySize: 5 * 1024 * 1024 * 1024`
- [x] Pass Hono app's `fetch` handler
- [x] Read port from `PORT` env (default: 3000)
- [x] Log startup banner with port and limits

---

### Task 7: PowerShell Bootstrap Script
**Files:** `setup-rclone.ps1`
**Specs:** BOOT-01 through BOOT-06

- [x] Write PowerShell script to download Rclone Windows AMD64 zip
- [x] Extract `rclone.exe` into `.bin/` directory
- [x] Verify binary with `rclone.exe version`
- [x] Print daemon start command
- [x] Manage `.gitignore` (add `.bin/` if missing)
- [x] Handle idempotency (skip if already downloaded)

---

### Task 8: Verification & Smoke Test
- [x] Run `bun run src/index.ts` to verify server starts without errors
- [x] Verify TypeScript compilation with `bunx tsc --noEmit`
- [x] Test `GET /health` endpoint returns expected JSON structure
- [x] Verify 5GB `maxRequestBodySize` is set in server config
