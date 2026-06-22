## Tasks

Implementation tasks for the Symbiosis Stream Engine scaffold. Execute in order — each task builds on the previous.

---

### Task 1: Project Foundation
**Files:** `package.json`, `tsconfig.json`
**Specs:** CFG-06, CFG-07

- [ ] Create `package.json` with project name `symbiosis-stream-engine`
  - Dependencies: `hono`, `@hono/body-limit`
  - Dev dependencies: `bun-types`, `typescript`
  - Scripts: `dev` (`bun run --hot src/index.ts`), `start` (`bun run src/index.ts`)
- [ ] Create `tsconfig.json` targeting Bun runtime
  - Types: `["bun-types"]`
  - Module resolution: `"bundler"`
  - Strict mode enabled
  - Target: `"ESNext"`, Module: `"ESNext"`
- [ ] Run `bun install` to verify dependency resolution

---

### Task 2: Rclone Configuration Module
**Files:** `src/config/rclone.ts`
**Specs:** CFG-03

- [ ] Create `src/config/rclone.ts` with typed `RcloneConfig` interface
- [ ] Read environment variables: `RCLONE_RC_HOST`, `RCLONE_RC_PORT`, `RCLONE_RC_USER`, `RCLONE_RC_PASS`
- [ ] Export `getRcloneBaseUrl()` helper returning `http://{host}:{port}`
- [ ] Export default config object with validated values

---

### Task 3: Rclone RC Service Layer
**Files:** `src/services/rcloneService.ts`
**Specs:** RC-01 through RC-08

- [ ] Create `RcloneService` class with constructor accepting config
- [ ] Implement `checkHealth()` method calling `rc/noop`
- [ ] Implement `streamUpload(stream, remotePath, fileName, accountId)` method
  - Construct request to `operations/uploadfile`
  - Pass `ReadableStream` as fetch body
  - Set `fs` and `remote` parameters
- [ ] Implement `listRemotes()` calling `config/listremotes`
- [ ] Implement `getTransferStatus(jobId)` calling `job/status`
- [ ] Add error translation layer (Rclone errors → structured errors)
- [ ] Add retry logic for transient failures (3 retries, exponential backoff)
- [ ] Support optional HTTP Basic Auth from config

---

### Task 4: Streaming Upload Routes
**Files:** `src/routes/stream.ts`
**Specs:** STREAM-01 through STREAM-06

- [ ] Create Hono router for stream routes
- [ ] Implement `POST /api/stream/upload/:accountId`
  - Apply `bodyLimit` middleware at 5GB
  - Extract `c.req.raw.body` as raw `ReadableStream`
  - Validate required headers: `X-File-Path`, `X-File-Name`
  - Validate `accountId` against path traversal
  - Call `RcloneService.streamUpload()` with the stream
  - Return JSON success/error response
- [ ] Handle abrupt client disconnection via AbortController
- [ ] Add proper error responses for all failure cases (400, 413, 502, 503)

---

### Task 5: Hono App & Global Middleware
**Files:** `src/app.ts`
**Specs:** CFG-02, CFG-04, CFG-05

- [ ] Create Hono instance in `src/app.ts`
- [ ] Register middleware stack:
  - Request ID generation
  - Request timing/logging
  - CORS (configurable via `CORS_ORIGIN` env)
  - Global error boundary
- [ ] Mount stream routes under `/api/stream`
- [ ] Implement `GET /health` endpoint
  - Check Rclone RC connectivity
  - Return uptime, status, and rclone health
- [ ] Implement global error boundary
  - Structured JSON error responses
  - No stack traces in production

---

### Task 6: Bun Server Entrypoint
**Files:** `src/index.ts`
**Specs:** CFG-01

- [ ] Create `src/index.ts` with `Bun.serve()`
- [ ] Set `maxRequestBodySize: 5 * 1024 * 1024 * 1024`
- [ ] Pass Hono app's `fetch` handler
- [ ] Read port from `PORT` env (default: 3000)
- [ ] Log startup banner with port and limits

---

### Task 7: PowerShell Bootstrap Script
**Files:** `setup-rclone.ps1`
**Specs:** BOOT-01 through BOOT-06

- [ ] Write PowerShell script to download Rclone Windows AMD64 zip
- [ ] Extract `rclone.exe` into `.bin/` directory
- [ ] Verify binary with `rclone.exe version`
- [ ] Print daemon start command
- [ ] Manage `.gitignore` (add `.bin/` if missing)
- [ ] Handle idempotency (skip if already downloaded)

---

### Task 8: Verification & Smoke Test
- [ ] Run `bun run src/index.ts` to verify server starts without errors
- [ ] Verify TypeScript compilation with `bunx tsc --noEmit`
- [ ] Test `GET /health` endpoint returns expected JSON structure
- [ ] Verify 5GB `maxRequestBodySize` is set in server config
