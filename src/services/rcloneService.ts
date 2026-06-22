/**
 * RcloneService — Communicates with the local Rclone daemon via HTTP RC API.
 *
 * All methods use standard fetch() which in Bun natively supports
 * ReadableStream request bodies for zero-copy streaming.
 */

import {
  type RcloneConfig,
  getRcloneBaseUrl,
  getRcloneAuthHeaders,
  rcloneConfig,
} from "../config/rclone";

// ────────────────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────────────────

export interface RcloneError {
  code: string;
  message: string;
  rcloneError?: unknown;
}

export interface HealthResult {
  healthy: boolean;
  latencyMs: number;
  error?: string;
}

export interface UploadResult {
  success: boolean;
  remote: string;
  bytes: number;
}

export interface TransferStatus {
  id: number;
  finished: boolean;
  success: boolean;
  error?: string;
  duration?: number;
  progress?: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

export class RcloneService {
  private readonly baseUrl: string;
  private readonly authHeaders: Record<string, string>;
  private readonly maxRetries: number;
  private readonly healthTimeout: number;

  constructor(
    config: RcloneConfig = rcloneConfig,
    options?: { maxRetries?: number; healthTimeoutMs?: number }
  ) {
    this.baseUrl = `http://${config.host}:${config.port}`;
    this.authHeaders = getRcloneAuthHeaders();
    this.maxRetries = options?.maxRetries ?? 3;
    this.healthTimeout = options?.healthTimeoutMs ?? 5_000;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Health Check  (RC-02)
  // ──────────────────────────────────────────────────────────────────────────

  async checkHealth(): Promise<HealthResult> {
    const start = performance.now();

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this.healthTimeout);

      const res = await fetch(`${this.baseUrl}/rc/noop`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.authHeaders,
        },
        body: "{}",
        signal: controller.signal,
      });

      clearTimeout(timer);

      const latencyMs = Math.round(performance.now() - start);

      if (!res.ok) {
        const text = await res.text().catch(() => "unknown");
        return {
          healthy: false,
          latencyMs,
          error: `Rclone RC returned ${res.status}: ${text}`,
        };
      }

      return { healthy: true, latencyMs };
    } catch (err) {
      const latencyMs = Math.round(performance.now() - start);
      const message =
        err instanceof Error ? err.message : "Unknown error during health check";
      return { healthy: false, latencyMs, error: message };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Stream Upload  (RC-03)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Pipes the incoming ReadableStream directly to Rclone's
   * `operations/uploadfile` endpoint.
   *
   * The stream is forwarded as a raw binary body — Rclone's RC API accepts
   * multipart/form-data with the file body and URL query params for `fs`
   * and `remote`.
   *
   * **This method MUST NOT be retried** — the ReadableStream is consumed
   * on the first read.
   */
  async streamUpload(
    stream: ReadableStream<Uint8Array>,
    remotePath: string,
    fileName: string,
    accountId: string,
    options?: {
      contentType?: string;
      contentLength?: number;
      signal?: AbortSignal;
    }
  ): Promise<UploadResult> {
    // The remote name is derived from the accountId.
    // e.g. accountId "gdrive1" → remote name "gdrive1:"
    const fs = `${accountId}:`;
    const remote = remotePath.endsWith("/")
      ? `${remotePath}${fileName}`
      : `${remotePath}/${fileName}`;

    // Build the URL with query parameters
    const url = new URL(`${this.baseUrl}/operations/uploadfile`);
    url.searchParams.set("fs", fs);
    url.searchParams.set("remote", remote);

    // ── Build multipart body with streaming file content ──
    // We manually construct a multipart form boundary to wrap the
    // ReadableStream without buffering it. The approach:
    //   1. Create a boundary string
    //   2. Prepend the multipart header as a preamble
    //   3. Pipe the raw file stream
    //   4. Append the multipart footer as an epilogue
    const boundary = `----SymbiosisUpload${Date.now()}${Math.random().toString(36).slice(2)}`;

    const preamble = new TextEncoder().encode(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${fileName}"\r\n` +
        `Content-Type: ${options?.contentType ?? "application/octet-stream"}\r\n` +
        `\r\n`
    );

    const epilogue = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);

    // Compose a new ReadableStream: preamble → file stream → epilogue
    const composedStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        controller.enqueue(preamble);

        const reader = stream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } catch (err) {
          controller.error(err);
          return;
        } finally {
          reader.releaseLock();
        }

        controller.enqueue(epilogue);
        controller.close();
      },
    });

    try {
      const res = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          ...this.authHeaders,
        },
        body: composedStream,
        signal: options?.signal,
        duplex: "half",
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw this.translateError(res.status, body);
      }

      return {
        success: true,
        remote: `${fs}${remote}`,
        bytes: options?.contentLength ?? 0,
      };
    } catch (err) {
      if (err && typeof err === "object" && "code" in err) {
        throw err; // Already an RcloneError
      }
      throw this.translateError(0, err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // List Remotes  (RC-04)
  // ──────────────────────────────────────────────────────────────────────────

  async listRemotes(): Promise<string[]> {
    const data = await this.rcCall<{ remotes: string[] }>(
      "config/listremotes",
      {}
    );
    return data.remotes ?? [];
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Transfer Status  (RC-05)
  // ──────────────────────────────────────────────────────────────────────────

  async getTransferStatus(jobId: number): Promise<TransferStatus> {
    const data = await this.rcCall<{
      finished: boolean;
      success: boolean;
      error: string;
      duration: number;
      progress: number;
      id: number;
    }>("job/status", { jobid: jobId });

    return {
      id: data.id ?? jobId,
      finished: data.finished ?? false,
      success: data.success ?? false,
      error: data.error || undefined,
      duration: data.duration,
      progress: data.progress,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Config Management
  // ──────────────────────────────────────────────────────────────────────────

  async createRemote(
    name: string,
    type: string,
    parameters: Record<string, unknown>
  ): Promise<unknown> {
    return this.rcCall("config/create", { name, type, parameters });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internal: Generic RC JSON-RPC call with retry  (RC-06, RC-07)
  // ──────────────────────────────────────────────────────────────────────────

  private async rcCall<T = unknown>(
    endpoint: string,
    params: Record<string, unknown>,
    retries = this.maxRetries
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await fetch(`${this.baseUrl}/${endpoint}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...this.authHeaders,
          },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const body = await res.text().catch(() => "");
          const err = this.translateError(res.status, body);

          // Non-transient (4xx) — do not retry
          if (res.status >= 400 && res.status < 500) {
            throw err;
          }

          lastError = err;
        } else {
          return (await res.json()) as T;
        }
      } catch (err) {
        // If it's already an RcloneError from a 4xx, throw immediately
        if (
          err &&
          typeof err === "object" &&
          "code" in err &&
          (err as RcloneError).code.startsWith("RCLONE_CLIENT_")
        ) {
          throw err;
        }
        lastError = err;
      }

      // Exponential backoff before retry
      if (attempt < retries) {
        const delay = Math.min(1000 * 2 ** attempt, 10_000);
        await new Promise((r) => setTimeout(r, delay));
      }
    }

    throw lastError;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Error Translation  (RC-06)
  // ──────────────────────────────────────────────────────────────────────────

  private translateError(status: number, raw: unknown): RcloneError {
    const message =
      typeof raw === "string"
        ? raw
        : raw instanceof Error
          ? raw.message
          : "Unknown Rclone RC error";

    if (status === 0 || status >= 500) {
      return {
        code: "RCLONE_SERVER_ERROR",
        message: `Rclone RC server error (${status || "network"}): ${message}`,
        rcloneError: raw,
      };
    }

    if (status >= 400) {
      return {
        code: "RCLONE_CLIENT_ERROR",
        message: `Rclone RC client error (${status}): ${message}`,
        rcloneError: raw,
      };
    }

    return {
      code: "RCLONE_UNKNOWN_ERROR",
      message: `Rclone RC error: ${message}`,
      rcloneError: raw,
    };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Singleton export for application-wide use
// ────────────────────────────────────────────────────────────────────────────

export const rcloneService = new RcloneService();
