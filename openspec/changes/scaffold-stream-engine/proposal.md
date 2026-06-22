## Why

The Symbiosis platform needs a high-performance streaming proxy microservice to handle multi-gigabyte file uploads from a frontend and pipe them directly to a local Rclone daemon on Windows. Current architectures buffer entire payloads into RAM or disk, which is catastrophic for multi-GB transfers on constrained machines. This service must operate as a zero-copy streaming bridge—never materializing file bodies in memory—to prevent OOM crashes and enable reliable transfers of files up to 5GB.

## What Changes

- Scaffold the complete "Symbiosis Stream Engine" microservice from scratch using **Bun**, **Hono**, and a native **Windows Rclone** installation.
- Implement zero-buffer streaming upload via Web Streams API (`ReadableStream` piping from HTTP ingress to Rclone RC API egress).
- Override Bun's default 128MB payload limit, raising it to 5GB via `maxRequestBodySize`.
- Implement native TCP backpressure handling through Web Streams piping semantics.
- Create a PowerShell bootstrap script (`setup-rclone.ps1`) to automate Rclone binary download and daemon initialization on Windows.
- Expose REST API routes for streaming uploads (`POST /api/stream/upload/:accountId`) and download proxying.
- Build an Rclone service layer communicating with the Rclone Windows process via HTTP JSON-RPC on `localhost:5572`.

## Capabilities

### New Capabilities
- `streaming-upload`: Zero-copy binary streaming pipeline from HTTP request body to Rclone RC `operations/uploadfile` endpoint, with backpressure and 5GB payload support.
- `rclone-rc-service`: Service layer for communicating with the local Rclone daemon via HTTP JSON-RPC API (health checks, upload forwarding, status polling).
- `rclone-bootstrap`: PowerShell automation for downloading, extracting, and initializing `rclone.exe` on Windows with Remote Control mode enabled.
- `server-config`: Bun server entrypoint configuration with overridden HTTP limits, Hono app binding, global error boundaries, and environment-driven Rclone connection settings.

### Modified Capabilities
_(None — this is a greenfield project.)_

## Impact

- **New codebase**: Entire `src/` directory, `package.json`, `tsconfig.json`, and `setup-rclone.ps1` are created from scratch.
- **Runtime dependency**: Requires Bun runtime (not Node.js) and a native Windows Rclone installation running as an RC daemon on port 5572.
- **Network surface**: Exposes HTTP API on a configurable port; communicates with `localhost:5572` for Rclone RC.
- **Dependencies**: `hono`, `@hono/body-limit` (npm packages installed via Bun).
- **OS constraint**: PowerShell bootstrap script is Windows-only. The service itself is cross-platform but optimized for Windows deployment.
