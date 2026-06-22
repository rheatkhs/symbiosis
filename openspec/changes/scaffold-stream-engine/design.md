## Overview

The Symbiosis Stream Engine is a lightweight, zero-buffer streaming proxy built on **Bun + Hono**. It receives multi-gigabyte file uploads over HTTP and pipes them directly to a local **Rclone RC daemon** on Windows via the Web Streams API. The architecture ensures no request body is ever materialized in RAM or on disk.

## Architecture

```
┌──────────────┐         ┌───────────────────────┐         ┌─────────────────┐
│   Frontend   │  POST   │   Symbiosis Stream    │  HTTP   │  Rclone RC      │
│   (Browser)  │────────▶│   Engine (Bun/Hono)   │────────▶│  Daemon :5572   │
│              │  5GB    │                       │ Stream  │  (Windows)      │
│              │  Stream │  ReadableStream pipe  │         │                 │
└──────────────┘         └───────────────────────┘         └────────┬────────┘
                                                                    │
                                                           ┌────────▼────────┐
                                                           │  Google Drive   │
                                                           │  Pool (Remote)  │
                                                           └─────────────────┘
```

### Key Layers

1. **Server Layer** (`src/index.ts`): Bun's native `Bun.serve()` with `maxRequestBodySize` set to 5GB. Binds the Hono `fetch` handler.
2. **App Layer** (`src/app.ts`): Hono instance with global middleware (CORS, error boundaries, request logging, health endpoints).
3. **Route Layer** (`src/routes/stream.ts`): Streaming upload/download endpoints. Extracts raw `ReadableStream` from `c.req.raw.body` — never calls `.json()`, `.text()`, or `.arrayBuffer()`.
4. **Service Layer** (`src/services/rcloneService.ts`): Encapsulates all communication with the Rclone RC daemon. Handles health checks, `operations/uploadfile` streaming, and status polling.
5. **Config Layer** (`src/config/rclone.ts`): Environment-driven configuration for Rclone RC connection (host, port, auth tokens).

## Data Flow: Streaming Upload

```
1. Client sends POST /api/stream/upload/:accountId
   Headers: Content-Type, X-File-Path, X-File-Name, Content-Length
   Body: Raw binary ReadableStream

2. Hono route handler:
   - Extracts c.req.raw.body (ReadableStream)
   - Validates accountId, required headers
   - Does NOT await or buffer the body

3. RcloneService.streamUpload():
   - Constructs multipart/form-data boundary manually
   - Pipes the incoming ReadableStream into a new Request body
     targeting http://localhost:5572/operations/uploadfile
   - The stream flows: Client TCP → Bun → fetch() → Rclone RC → Google Drive
   - Backpressure is handled natively by the Web Streams pipe chain

4. Response: Returns Rclone's JSON response (success/error) to the client
```

## Component Design

### `src/index.ts` — Server Entrypoint
- Calls `Bun.serve()` with explicit `maxRequestBodySize: 5 * 1024 * 1024 * 1024`
- Passes the Hono app's `fetch` as the handler
- Reads port from `PORT` env var (default: 3000)
- Logs startup banner with configured limits

### `src/app.ts` — Hono Application
- Creates the root `Hono` instance
- Registers global middleware:
  - CORS with configurable origins
  - Request ID generation
  - Request timing/logging
  - Global error boundary returning structured JSON errors
- Mounts route modules: `stream` routes under `/api/stream`
- Health endpoint: `GET /health` returns server status + Rclone daemon connectivity

### `src/config/rclone.ts` — Rclone Configuration
- Reads from environment variables:
  - `RCLONE_RC_HOST` (default: `127.0.0.1`)
  - `RCLONE_RC_PORT` (default: `5572`)
  - `RCLONE_RC_USER` (optional, for `--rc-user`)
  - `RCLONE_RC_PASS` (optional, for `--rc-pass`)
- Exports a typed config object and a `getRcloneBaseUrl()` helper
- Validates configuration on import (fails fast if Rclone RC is unreachable at startup)

### `src/routes/stream.ts` — Streaming Routes
- **POST `/api/stream/upload/:accountId`**: 
  - Protected by `bodyLimit({ maxSize: 5 * 1024 * 1024 * 1024 })` from `@hono/body-limit`
  - Extracts `ReadableStream` from `c.req.raw.body`
  - Requires headers: `X-File-Path` (remote destination), `X-File-Name`
  - Calls `RcloneService.streamUpload()` with the raw stream
  - Returns JSON: `{ success, remote, bytes }`
  - Handles abrupt client disconnection gracefully (stream abort signals)

### `src/services/rcloneService.ts` — Rclone Service
- **Class-based** singleton service
- Methods:
  - `checkHealth()`: Calls `rc/noop` to verify daemon is alive
  - `streamUpload(stream, remotePath, fileName, accountId)`: Pipes the ReadableStream to Rclone's `operations/uploadfile` endpoint using `fetch()` with a streaming body
  - `listRemotes()`: Calls `config/listremotes` for available backends
  - `getTransferStatus(jobId)`: Polls `job/status` for async transfer progress
- Uses standard `fetch()` for all HTTP calls (Bun's native fetch supports streaming bodies)
- Implements retry logic for transient Rclone RC failures
- Formats Rclone RC errors into structured error objects

### `setup-rclone.ps1` — PowerShell Bootstrap
- Downloads the latest Rclone Windows AMD64 zip from `https://downloads.rclone.org/rclone-current-windows-amd64.zip`
- Extracts `rclone.exe` into `.bin/` directory within the project
- Verifies the binary by running `rclone.exe version`
- Prints the command to start the RC daemon: `.bin/rclone.exe rcd --rc-no-auth --rc-addr=:5572`
- Adds `.bin/` to `.gitignore` if not already present

## Technical Decisions

| Decision | Rationale |
|---|---|
| **Bun over Node.js** | Native Web Streams support, faster HTTP server, built-in `maxRequestBodySize` |
| **Hono over Express** | Web-standard Request/Response, zero-overhead routing, native streaming support |
| **`c.req.raw.body` over `c.req.body`** | Accesses the raw `ReadableStream` without any parsing or buffering |
| **`fetch()` for Rclone RC** | Bun's fetch natively supports `ReadableStream` as request body — enables zero-copy piping |
| **`operations/uploadfile` over `operations/copyfile`** | `uploadfile` accepts a streaming file body directly via multipart POST |
| **No `multer`/`busboy`** | These libraries buffer to disk. We pipe raw streams directly. |
| **Class-based service** | Encapsulates Rclone RC state (base URL, retry config) cleanly |

## Error Handling Strategy

- **Client disconnection**: The `ReadableStream` will signal abort. The fetch to Rclone RC will also abort, preventing orphaned transfers.
- **Rclone RC unavailable**: Health check at startup; per-request health validation with structured error response (503).
- **Rclone transfer failure**: Rclone RC returns error JSON, which is parsed and forwarded to the client with appropriate HTTP status.
- **Oversized payload**: `@hono/body-limit` middleware rejects before streaming begins (413).
- **Missing headers**: Route validation returns 400 with specific missing field names.

## Security Considerations

- Rclone RC runs with `--rc-no-auth` for local development. Production should use `--rc-user`/`--rc-pass` with env vars.
- `accountId` parameter is validated to prevent path traversal in remote paths.
- No file content is logged or inspected — streams pass through opaquely.
- CORS is restricted to configured origins only.
