/**
 * Symbiosis Stream Engine — Bun Server Entrypoint
 *
 * Starts the HTTP server with a 5 GB max request body size,
 * binding the Hono application's fetch handler.
 */

import app from "./app";

// ── Server Configuration ────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const MAX_BODY_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

// ── Start Server ────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
  maxRequestBodySize: MAX_BODY_SIZE,
});

// ── Startup Banner ──────────────────────────────────────────────────────────

const maxSizeFormatted = `${(MAX_BODY_SIZE / (1024 * 1024 * 1024)).toFixed(0)} GB`;

console.log("");
console.log("  ╔══════════════════════════════════════════════════╗");
console.log("  ║         SYMBIOSIS STREAM ENGINE                 ║");
console.log("  ╠══════════════════════════════════════════════════╣");
console.log(`  ║  Port:             ${String(PORT).padEnd(30)}║`);
console.log(`  ║  Max Body Size:    ${maxSizeFormatted.padEnd(30)}║`);
console.log(`  ║  Rclone RC:        ${(process.env.RCLONE_RC_HOST ?? "127.0.0.1").padEnd(30)}║`);
console.log(`  ║  Rclone RC Port:   ${(process.env.RCLONE_RC_PORT ?? "5572").padEnd(30)}║`);
console.log("  ╠══════════════════════════════════════════════════╣");
console.log("  ║  Endpoints:                                     ║");
console.log("  ║    GET  /health                                  ║");
console.log("  ║    POST /api/stream/upload/:accountId            ║");
console.log("  ╚══════════════════════════════════════════════════╝");
console.log("");
console.log(`  🚀 Server listening on http://localhost:${PORT}`);
console.log("");

export default server;
