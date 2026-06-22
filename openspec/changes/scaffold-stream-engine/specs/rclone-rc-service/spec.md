## Capability: rclone-rc-service

Service layer for communicating with the local Rclone daemon via HTTP JSON-RPC API.

## Requirements

### RC-01: Service Class Architecture
- The service MUST be implemented as a TypeScript class (`RcloneService`) that encapsulates all Rclone RC communication.
- The service MUST accept configuration (host, port, optional auth) via constructor or config import.
- The service MUST be instantiable as a singleton for the application lifecycle.

### RC-02: Health Check
- The service MUST implement a `checkHealth()` method that calls `rc/noop` on the Rclone RC endpoint.
- Health check MUST return a structured result: `{ healthy: boolean, latencyMs: number, error?: string }`.
- Health check MUST have a configurable timeout (default: 5 seconds).

### RC-03: Stream Upload Forwarding
- The service MUST implement `streamUpload(stream: ReadableStream, remotePath: string, fileName: string, accountId: string)`.
- The method MUST construct a valid `fetch()` request to `http://{host}:{port}/operations/uploadfile`.
- The method MUST pass the `ReadableStream` as the request body (or as part of a multipart body if required by Rclone's API).
- The method MUST set the `fs` parameter to the appropriate remote name derived from `accountId`.
- The method MUST set the `remote` parameter to the destination path constructed from `remotePath` and `fileName`.

### RC-04: Remote Listing
- The service MUST implement `listRemotes()` that calls `config/listremotes` on the Rclone RC API.
- The method MUST return an array of remote names as strings.

### RC-05: Transfer Status Polling
- The service MUST implement `getTransferStatus(jobId: number)` that calls `job/status` on the Rclone RC API.
- The method MUST return the job's progress, status, and any error information.

### RC-06: Error Translation
- All Rclone RC errors MUST be translated into structured error objects: `{ code: string, message: string, rcloneError?: unknown }`.
- HTTP 4xx from Rclone RC MUST map to application-level errors (not server errors).
- HTTP 5xx or network failures from Rclone RC MUST map to 502/503 errors.

### RC-07: Retry Logic
- Transient failures (network timeouts, connection refused) MUST be retried up to 3 times with exponential backoff.
- Non-transient failures (4xx, invalid parameters) MUST NOT be retried.
- Streaming upload operations MUST NOT be retried (streams are consumed on first read).

### RC-08: Authentication Support
- If `RCLONE_RC_USER` and `RCLONE_RC_PASS` environment variables are set, the service MUST include HTTP Basic Auth headers in all RC requests.
- If auth is not configured, requests MUST be sent without authentication headers.
