/**
 * Stream Routes — Binary upload/download pipelines.
 *
 * Critical invariant: request bodies are NEVER materialized in memory.
 * We extract `c.req.raw.body` as a raw ReadableStream and pipe it
 * directly to the Rclone RC daemon.
 */

import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { rcloneService } from "../services/rcloneService";

// 5 GB in bytes
const FIVE_GB = 5 * 1024 * 1024 * 1024;

// Path traversal patterns to reject in accountId
const PATH_TRAVERSAL_RE = /(?:^|\/)\.\.(?:\/|$)|[<>:"|?*\x00-\x1f]/;

export const streamRoutes = new Hono();

// ────────────────────────────────────────────────────────────────────────────
// POST /upload/:accountId — Streaming file upload to Rclone
// ────────────────────────────────────────────────────────────────────────────

streamRoutes.post(
  "/upload/:accountId",
  bodyLimit({
    maxSize: FIVE_GB,
    onError: (c) => {
      return c.json(
        {
          error: "Payload exceeds the 5 GB upload limit.",
          maxBytes: FIVE_GB,
        },
        413
      );
    },
  }),
  async (c) => {
    // ── Validate accountId ──────────────────────────────────────────────
    const accountId = c.req.param("accountId");

    if (!accountId || PATH_TRAVERSAL_RE.test(accountId)) {
      return c.json(
        {
          error: "Invalid accountId. Must be alphanumeric with no path traversal.",
          accountId,
        },
        400
      );
    }

    // ── Validate required headers ───────────────────────────────────────
    const filePath = c.req.header("X-File-Path");
    const fileName = c.req.header("X-File-Name");

    const missing: string[] = [];
    if (!filePath) missing.push("X-File-Path");
    if (!fileName) missing.push("X-File-Name");

    if (missing.length > 0) {
      return c.json(
        {
          error: `Missing required headers: ${missing.join(", ")}`,
          required: ["X-File-Path", "X-File-Name"],
        },
        400
      );
    }

    // ── Extract raw ReadableStream — NEVER buffer ───────────────────────
    const body = c.req.raw.body;

    if (!body) {
      return c.json({ error: "Request body is empty." }, 400);
    }

    // ── Pipe to Rclone with abort propagation ───────────────────────────
    const abortController = new AbortController();

    // Propagate client disconnection
    c.req.raw.signal.addEventListener("abort", () => {
      abortController.abort();
    });

    try {
      const contentLength = c.req.header("Content-Length");
      const contentType = c.req.header("Content-Type");

      const result = await rcloneService.streamUpload(
        body,
        filePath!,
        fileName!,
        accountId,
        {
          contentType: contentType ?? undefined,
          contentLength: contentLength ? parseInt(contentLength, 10) : undefined,
          signal: abortController.signal,
        }
      );

      return c.json(result, 200);
    } catch (err) {
      // Client disconnected — don't log as server error
      if (abortController.signal.aborted) {
        return c.json({ error: "Upload aborted by client." }, 400);
      }

      // Rclone RC errors
      if (err && typeof err === "object" && "code" in err) {
        const rcloneErr = err as {
          code: string;
          message: string;
          rcloneError?: unknown;
        };

        if (rcloneErr.code === "RCLONE_SERVER_ERROR") {
          return c.json(
            { error: rcloneErr.message, code: rcloneErr.code },
            502
          );
        }

        return c.json(
          { error: rcloneErr.message, code: rcloneErr.code },
          400
        );
      }

      // Connection refused / daemon down
      const message = err instanceof Error ? err.message : "Unknown error";
      if (
        message.includes("ECONNREFUSED") ||
        message.includes("fetch failed")
      ) {
        return c.json(
          {
            error: "Rclone RC daemon is unavailable.",
            details: message,
          },
          503
        );
      }

      // Unexpected error — rethrow to global error boundary
      throw err;
    }
  }
);
