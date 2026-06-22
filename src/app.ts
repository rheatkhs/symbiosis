/**
 * Hono Application — Global middleware stack and route mounting.
 *
 * Middleware order:
 *   1. Request ID generation
 *   2. Request timing / logging
 *   3. CORS
 *   4. Global error boundary
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamRoutes } from "./routes/stream";
import { rcloneService } from "./services/rcloneService";

const app = new Hono();

// ────────────────────────────────────────────────────────────────────────────
// 1. Request ID Generation
// ────────────────────────────────────────────────────────────────────────────

app.use("*", async (c, next) => {
  const requestId =
    c.req.header("X-Request-Id") ??
    `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  c.set("requestId" as never, requestId);
  c.header("X-Request-Id", requestId);
  await next();
});

// ────────────────────────────────────────────────────────────────────────────
// 2. Request Timing / Logging
// ────────────────────────────────────────────────────────────────────────────

app.use("*", async (c, next) => {
  const start = performance.now();
  await next();
  const durationMs = (performance.now() - start).toFixed(1);
  c.header("X-Response-Time", `${durationMs}ms`);

  const status = c.res.status;
  const method = c.req.method;
  const path = c.req.path;
  const level = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";

  console.log(
    `[${level}] ${method} ${path} → ${status} (${durationMs}ms)`
  );
});

// ────────────────────────────────────────────────────────────────────────────
// 3. CORS
// ────────────────────────────────────────────────────────────────────────────

const corsOrigin = process.env.CORS_ORIGIN ?? "*";

app.use(
  "*",
  cors({
    origin: corsOrigin === "*" ? "*" : corsOrigin.split(",").map((o) => o.trim()),
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Authorization",
      "X-Request-Id",
      "X-File-Path",
      "X-File-Name",
    ],
    exposeHeaders: ["X-Request-Id", "X-Response-Time"],
    maxAge: 86400,
  })
);

// ────────────────────────────────────────────────────────────────────────────
// 4. Global Error Boundary  (CFG-04)
// ────────────────────────────────────────────────────────────────────────────

app.onError((err, c) => {
  const requestId = (c.get as (key: string) => string | undefined)(
    "requestId"
  );
  const isProduction = process.env.NODE_ENV === "production";

  console.error(
    `[ERROR] Unhandled exception [${requestId ?? "unknown"}]:`,
    isProduction ? err.message : err
  );

  return c.json(
    {
      error: isProduction ? "Internal server error" : err.message,
      ...(requestId ? { requestId } : {}),
      timestamp: new Date().toISOString(),
    },
    500
  );
});

// 404 handler
app.notFound((c) => {
  return c.json(
    {
      error: "Not found",
      path: c.req.path,
      timestamp: new Date().toISOString(),
    },
    404
  );
});

// ────────────────────────────────────────────────────────────────────────────
// Health Endpoint  (CFG-05)
// ────────────────────────────────────────────────────────────────────────────

const startedAt = Date.now();

app.get("/health", async (c) => {
  const rcloneHealth = await rcloneService.checkHealth();

  return c.json({
    status: "ok",
    uptime: Math.round((Date.now() - startedAt) / 1000),
    rclone: {
      healthy: rcloneHealth.healthy,
      latencyMs: rcloneHealth.latencyMs,
      ...(rcloneHealth.error ? { error: rcloneHealth.error } : {}),
    },
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Route Mounting
// ────────────────────────────────────────────────────────────────────────────

app.route("/api/stream", streamRoutes);

export default app;
