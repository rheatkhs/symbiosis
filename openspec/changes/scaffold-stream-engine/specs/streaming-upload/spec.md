## Capability: streaming-upload

Zero-copy binary streaming pipeline from HTTP request body to Rclone RC `operations/uploadfile` endpoint.

## Requirements

### STREAM-01: Zero-Buffer Request Body Handling
- The server MUST extract the incoming HTTP request body as a raw `ReadableStream` using `c.req.raw.body`.
- The server MUST NOT call `.json()`, `.text()`, `.arrayBuffer()`, `.blob()`, or any method that materializes the full body in memory.
- The server MUST NOT use multipart parsing libraries (multer, busboy, formidable) that buffer to RAM or disk.

### STREAM-02: Direct Stream Piping to Rclone
- The incoming `ReadableStream` MUST be piped directly into a `fetch()` call targeting the Rclone RC `operations/uploadfile` endpoint.
- The stream chain MUST be: `Client TCP → Bun HTTP → ReadableStream → fetch() body → Rclone RC → Cloud Storage`.
- No intermediate `ArrayBuffer`, `Blob`, or temporary file MUST exist in this chain.

### STREAM-03: 5GB Payload Support
- The Bun server MUST set `maxRequestBodySize` to `5 * 1024 * 1024 * 1024` (5,368,709,120 bytes).
- The Hono route MUST apply `bodyLimit` middleware set to 5GB to provide application-level enforcement.
- Payloads exceeding 5GB MUST be rejected with HTTP 413 before streaming begins.

### STREAM-04: Native Backpressure Handling
- The implementation MUST rely on Web Streams API piping semantics for TCP backpressure.
- If the Rclone RC upstream (Google Drive) slows down, the pipe chain MUST automatically slow down the client's upload rate.
- No manual chunking, buffering, or flow control logic is required — the Web Streams pipe handles this natively.

### STREAM-05: Upload Route Contract
- Route: `POST /api/stream/upload/:accountId`
- Required URL parameter: `accountId` (string, validated against path traversal)
- Required headers:
  - `X-File-Path`: Remote destination path on the cloud storage backend
  - `X-File-Name`: Name of the file being uploaded
- Optional headers:
  - `Content-Length`: Hint for the total file size
  - `Content-Type`: MIME type of the file (forwarded to Rclone)
- Success response: `200 OK` with JSON `{ success: true, remote: string, bytes: number }`
- Error responses:
  - `400`: Missing required headers or invalid accountId
  - `413`: Payload exceeds 5GB limit
  - `502`: Rclone RC communication failure
  - `503`: Rclone RC daemon unavailable

### STREAM-06: Abrupt Disconnection Handling
- If the client disconnects mid-upload, the `ReadableStream` MUST signal an abort.
- The outgoing `fetch()` to Rclone RC MUST also abort, preventing orphaned partial uploads.
- The server MUST NOT crash or leak resources on abrupt disconnection.
- An `AbortController` or equivalent mechanism MUST propagate cancellation through the pipe chain.
