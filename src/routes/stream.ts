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
import { db } from "../db";
import { accounts, transfers } from "../db/schema";
import { eq, or } from "drizzle-orm";

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

    // Helper validation for UUID
    const isValidUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

    // ── Fetch Account from Database ────────────────────────────────────
    let account;
    try {
      const conditions = [eq(accounts.remoteName, accountId)];
      if (isValidUuid(accountId)) {
        conditions.push(eq(accounts.id, accountId));
      }
      const results = await db.select().from(accounts).where(or(...conditions)).limit(1);
      account = results[0];
    } catch (dbErr) {
      console.error("Database query failed while fetching account:", dbErr);
    }

    if (!account) {
      return c.json(
        {
          error: "Account not found in the database. Please register the account first.",
          accountId,
        },
        404
      );
    }

    // ── Validate required headers ───────────────────────────────────────
    const filePath = c.req.header("X-File-Path");
    const fileName = c.req.header("X-File-Name");

    const missing: string[] = [];
    if (filePath === undefined || filePath === null) missing.push("X-File-Path");
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

    // ── Register Transfer in Database ─────────────────────────────────
    const contentLength = c.req.header("Content-Length");
    const contentType = c.req.header("Content-Type");
    const fileSize = contentLength ? parseInt(contentLength, 10) : 0;
    const startTime = performance.now();

    let transfer: any;
    try {
      const [inserted] = await db
        .insert(transfers)
        .values({
          accountId: account.id,
          fileName: fileName!,
          filePath: filePath!,
          fileSize,
          status: "streaming",
        })
        .returning();
      transfer = inserted;
    } catch (dbErr) {
      console.error("Database insert failed for transfer:", dbErr);
    }

    // ── Pipe to Rclone with abort propagation ───────────────────────────
    const abortController = new AbortController();

    // Propagate client disconnection
    c.req.raw.signal.addEventListener("abort", () => {
      abortController.abort();
    });

    try {
      const result = await rcloneService.streamUpload(
        body,
        filePath!,
        fileName!,
        account.remoteName, // Use the actual remoteName from the DB
        {
          contentType: contentType ?? undefined,
          contentLength: fileSize ? fileSize : undefined,
          signal: abortController.signal,
        }
      );

      // Update Transfer & Storage stats on Success
      const durationMs = Math.round(performance.now() - startTime);
      if (transfer) {
        try {
          await db
            .update(transfers)
            .set({
              status: "completed",
              completedAt: new Date(),
              durationMs,
            })
            .where(eq(transfers.id, transfer.id));
        } catch (dbErr) {
          console.error("Failed to update transfer to completed:", dbErr);
        }
      }

      try {
        const newStorageUsed = account.storageUsed + fileSize;
        await db
          .update(accounts)
          .set({
            storageUsed: newStorageUsed,
            updatedAt: new Date(),
          })
          .where(eq(accounts.id, account.id));
      } catch (dbErr) {
        console.error("Failed to update account storage usage:", dbErr);
      }

      return c.json(result, 200);
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      const errorMessage = err instanceof Error ? err.message : String(err);

      // Update Transfer on Failure
      if (transfer) {
        try {
          await db
            .update(transfers)
            .set({
              status: "failed",
              completedAt: new Date(),
              durationMs,
              error: errorMessage,
            })
            .where(eq(transfers.id, transfer.id));
        } catch (dbErr) {
          console.error("Failed to update transfer status to failed:", dbErr);
        }
      }

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
      if (
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("fetch failed")
      ) {
        return c.json(
          {
            error: "Rclone RC daemon is unavailable.",
            details: errorMessage,
          },
          503
        );
      }

      // Unexpected error — rethrow to global error boundary
      throw err;
    }
  }
);

function getMimeTypeByExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const mimeMap: Record<string, string> = {
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    svg: "image/svg+xml",
    webp: "image/webp",
    bmp: "image/bmp",
    ico: "image/x-icon",
    // Videos
    mp4: "video/mp4",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    wmv: "video/x-ms-wmv",
    flv: "video/x-flv",
    webm: "video/webm",
    m4v: "video/x-m4v",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    flac: "audio/flac",
    ogg: "audio/ogg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    // Documents
    pdf: "application/pdf",
    txt: "text/plain",
    rtf: "application/rtf",
    md: "text/markdown",
    csv: "text/csv",
    html: "text/html",
    css: "text/css",
    js: "application/javascript",
    json: "application/json",
  };
  return mimeMap[ext] ?? "application/octet-stream";
}

streamRoutes.get("/download/:accountId", async (c) => {
  const accountId = c.req.param("accountId");
  const filePath = c.req.query("path");

  if (!accountId || PATH_TRAVERSAL_RE.test(accountId)) {
    return c.json({ error: "Invalid accountId. Must be alphanumeric with no path traversal." }, 400);
  }
  if (!filePath) {
    return c.json({ error: "Missing required 'path' query parameter." }, 400);
  }

  // Helper validation for UUID
  const isValidUuid = (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  // Fetch Account from Database
  let account;
  try {
    const conditions = [eq(accounts.remoteName, accountId)];
    if (isValidUuid(accountId)) {
      conditions.push(eq(accounts.id, accountId));
    }
    const results = await db.select().from(accounts).where(or(...conditions)).limit(1);
    account = results[0];
  } catch (dbErr) {
    console.error("Database query failed while fetching account:", dbErr);
  }

  if (!account) {
    return c.json({ error: "Account not found." }, 404);
  }

  try {
    const stream = await rcloneService.downloadFileStream(account.remoteName, filePath);
    const fileName = filePath.split("/").pop() || "file";

    c.header("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
    c.header("Content-Type", getMimeTypeByExtension(fileName));
    c.header("Cache-Control", "public, max-age=3600");

    return c.body(stream);
  } catch (err: any) {
    console.error("Failed to stream download file:", err);
    return c.json(
      {
        error: "Failed to download file from remote storage.",
        details: err instanceof Error ? err.message : String(err),
      },
      500
    );
  }
});
