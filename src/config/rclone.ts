/**
 * Rclone RC daemon connection configuration.
 *
 * All settings are read from environment variables with sensible defaults
 * for local development (rc-no-auth on 127.0.0.1:5572).
 */

export interface RcloneConfig {
  /** Rclone RC daemon hostname */
  host: string;
  /** Rclone RC daemon port */
  port: number;
  /** Optional HTTP Basic Auth username (--rc-user) */
  user?: string;
  /** Optional HTTP Basic Auth password (--rc-pass) */
  pass?: string;
}

/**
 * Load and validate Rclone RC configuration from environment variables.
 */
function loadConfig(): RcloneConfig {
  const host = process.env.RCLONE_RC_HOST ?? "127.0.0.1";
  const portRaw = process.env.RCLONE_RC_PORT ?? "5572";
  const port = parseInt(portRaw, 10);

  if (Number.isNaN(port) || port < 1 || port > 65535) {
    throw new Error(
      `[config/rclone] Invalid RCLONE_RC_PORT: "${portRaw}". Must be a number between 1 and 65535.`
    );
  }

  const user = process.env.RCLONE_RC_USER || undefined;
  const pass = process.env.RCLONE_RC_PASS || undefined;

  if ((user && !pass) || (!user && pass)) {
    console.warn(
      "[config/rclone] Warning: Only one of RCLONE_RC_USER / RCLONE_RC_PASS is set. Both are required for authentication."
    );
  }

  return { host, port, user, pass };
}

/** Resolved Rclone RC configuration singleton */
export const rcloneConfig: RcloneConfig = loadConfig();

/**
 * Returns the base URL for the Rclone RC API.
 * @example "http://127.0.0.1:5572"
 */
export function getRcloneBaseUrl(): string {
  return `http://${rcloneConfig.host}:${rcloneConfig.port}`;
}

/**
 * Build HTTP headers for Rclone RC requests.
 * Includes Basic Auth if user/pass are configured.
 */
export function getRcloneAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};

  if (rcloneConfig.user && rcloneConfig.pass) {
    const credentials = btoa(`${rcloneConfig.user}:${rcloneConfig.pass}`);
    headers["Authorization"] = `Basic ${credentials}`;
  }

  return headers;
}
