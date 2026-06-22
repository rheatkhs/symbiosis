# 🧬 Symbiosis Stream Engine

Symbiosis is a high-performance, concurrent stream engine and cloud storage aggregator built with **Bun**, **Hono**, and a native **Windows Rclone** connection. It serves as a zero-buffering proxy that streams multi-gigabyte uploads live from clients directly to local Rclone remotes (e.g. Google Drive pools).

The system integrates a PostgreSQL database (via **Neon** and **Drizzle ORM**) to store logs of all active/completed uploads and manage registered storage remotes. A premium glassmorphic frontend dashboard built with **TanStack Router**, **TanStack Query**, and **UnoCSS** allows users to monitor streaming status and manage remotes.

---

## 🚀 Key Features

* **Zero-RAM Stream Proxy**: Bypasses memory buffers and temp files entirely, using standard Web `ReadableStream` pipelines to route incoming streams straight to Rclone's HTTP endpoints.
* **Persistent Transfer Logging**: Tracks streaming state (`pending`, `streaming`, `completed`, `failed`), timestamps, upload sizes, duration metrics, and error logs.
* **Neon + Drizzle ORM**: Type-safe schema definitions and migration management with modern PostgreSQL features.
* **Dashboard SPA**: Fully integrated monitoring dashboard presenting real-time speed, status telemetry, active streams, and storage limits.
* **Automated Windows Rclone Helper**: Powershell script to download, configure, and daemonize native Rclone installations for local development.

---

## 🛠️ Prerequisites

1. **Bun Runtime**: Ensure [Bun](https://bun.sh) is installed on your machine (`v1.0` or higher).
2. **PostgreSQL**: A running PostgreSQL instance (highly optimized for [Neon.tech](https://neon.tech) serverless database).
3. **Windows Environment**: Local admin rights to configure the native Rclone daemon via PowerShell.

---

## ⚙️ Installation & Setup

### 1. Install Root Dependencies

Install dependencies for both the Hono backend server and database layers:

```bash
bun install
```

### 2. Configure Environment Variables

Copy the configuration template:

```bash
cp .env.example .env
```

Open `.env` and fill in your connection details:

* `DATABASE_URL`: Your Postgres/Neon connection string.
* `PORT`: Port for the API proxy (defaults to `3000`).
* `RCLONE_RC_HOST` / `RCLONE_RC_PORT`: Target addresses for Rclone control connection.

### 3. Push Database Schema

Use Drizzle Kit to create tables on your Neon PostgreSQL instance:

```bash
bun run db:push
```

*(Or run the direct CLI command: `bunx drizzle-kit push:pg`)*

### 4. Setup Rclone Daemon (Windows)

Run the automated PowerShell script in an Administrator console to download, unpack, configure, and boot Rclone:

```powershell
powershell -ExecutionPolicy Bypass -File setup-rclone.ps1
```

*This installs Rclone to `.rclone/`, writes a default mock Google Drive configuration block, and starts the Rclone Remote Control (RC) HTTP interface on port `5572`.*

---

## 💻 Running the Application

### Start the API Proxy Backend

Run the Hono server in hot-reload development mode:

```bash
bun run dev
```

The server will boot and display connection details:

```
  ╔══════════════════════════════════════════════════╗
  ║         SYMBIOSIS STREAM ENGINE                  ║
  ╠══════════════════════════════════════════════════╣
  ║  Port:             3000                          ║
  ║  Max Body Size:    5 GB                          ║
  ║  Rclone RC:        127.0.0.1                     ║
  ║  Rclone RC Port:   5572                          ║
  ╚══════════════════════════════════════════════════╝
```

### Start the React Dashboard Frontend

Open another terminal pane, navigate to the `dashboard/` directory, install packages, and start Vite:

```bash
cd dashboard
bun install
bun run dev
```

Open your browser to the URL printed by Vite (typically `http://localhost:5173`). The dashboard is pre-configured with a Vite reverse proxy directing `/api/*` and `/health` requests to the Hono backend on port `3000`.

---

## 📬 API & Upload Usage Guide

### 1. Register a Storage Remote

Remotes can be registered directly inside the **Accounts** tab on the Dashboard or using curl:

```bash
curl -X POST http://localhost:3000/api/dash/accounts \
  -H "Content-Type: application/json" \
  -d '{"name": "Google Drive Backup", "remoteName": "gdrive1", "provider": "google drive", "storageLimit": 107374182400}'
```

*Note: `remoteName` must match a configured block name in your local `rclone.conf` (e.g. `gdrive1`).*

### 2. Stream a File Upload

Upload files directly through the Hono proxy server. Provide file metadata inside headers to keep the payload raw:

```bash
curl -X POST \
  -H "X-File-Path: /Backups/June" \
  -H "X-File-Name: archive_2026.zip" \
  -T "path/to/local/file.zip" \
  http://localhost:3000/api/stream/upload/gdrive1
```

**Header Parameters**:

* `X-File-Path` (required): Target directory path on your remote cloud drive.
* `X-File-Name` (required): Output filename to write.
* `X-File-Size` (optional): Precise file size.

During streaming, progress and speeds are piped directly, the database logs the active stream, and the **Dashboard** displays live metrics. Upon success or crash, database stats are updated automatically.
