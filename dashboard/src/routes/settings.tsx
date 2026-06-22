import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

interface HealthStatus {
  status: string;
  uptime: number;
  rclone: {
    healthy: boolean;
    latencyMs: number;
    error?: string;
  };
}

async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch("/health");
  if (!res.ok) throw new Error("Failed to check engine health");
  return res.json();
}

function SettingsPage() {
  const { data: health, isLoading: healthLoading, error: healthError } = useQuery({
    queryKey: ["engineHealth"],
    queryFn: fetchHealth,
    refetchInterval: 5000,
  });

  const { data: accountsList, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
  });

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white m-0">System Configuration</h2>
        <p className="text-xs text-gray-500 m-0 mt-1">Telemetry, daemon state, and configuration metrics for Symbiosis.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Rclone Daemon Health */}
        <div className="glass-card space-y-6">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase m-0 flex items-center gap-2 border-b border-solid border-white/5 pb-4">
            <span className="i-lucide-server text-violet-400"></span>
            Rclone Daemon Status
          </h3>

          {healthLoading ? (
            <div className="space-y-3 py-2">
              <div className="h-4 bg-white/5 rounded animate-pulse"></div>
              <div className="h-4 bg-white/5 rounded animate-pulse"></div>
              <div className="h-4 bg-white/5 rounded animate-pulse"></div>
            </div>
          ) : healthError || !health ? (
            <div className="bg-red-500/10 border border-solid border-red-500/20 text-red-400 text-xs rounded-lg p-4">
              Failed to connect to the Symbiosis Stream Engine. Is the Hono server running on port 3000?
            </div>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="flex justify-between border-b border-solid border-white/3 pb-2.5">
                <span className="text-gray-500">Connection Health</span>
                <span className={`font-semibold flex items-center gap-1.5 ${health.rclone.healthy ? "text-green-400" : "text-red-400"}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${health.rclone.healthy ? "bg-green-400" : "bg-red-400 animate-pulse"}`}></span>
                  {health.rclone.healthy ? "ONLINE" : "UNHEALTHY / TIMEOUT"}
                </span>
              </div>

              <div className="flex justify-between border-b border-solid border-white/3 pb-2.5">
                <span className="text-gray-500">RC Latency</span>
                <span className="font-mono text-gray-300">{health.rclone.latencyMs}ms</span>
              </div>

              <div className="flex justify-between border-b border-solid border-white/3 pb-2.5">
                <span className="text-gray-500">Proxy Uptime</span>
                <span className="font-mono text-gray-300">{formatUptime(health.uptime)}</span>
              </div>

              {health.rclone.error && (
                <div className="p-3 bg-red-950/20 border border-solid border-red-500/20 text-red-400 rounded-lg font-mono text-[10px]">
                  <strong>Daemon Error:</strong> {health.rclone.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Local Proxy Engine Settings */}
        <div className="glass-card space-y-6">
          <h3 className="text-sm font-semibold text-white tracking-wide uppercase m-0 flex items-center gap-2 border-b border-solid border-white/5 pb-4">
            <span className="i-lucide-sliders text-violet-400"></span>
            Proxy Configuration
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex justify-between border-b border-solid border-white/3 pb-2.5">
              <span className="text-gray-500">Server Port</span>
              <span className="font-mono text-gray-300">3000</span>
            </div>

            <div className="flex justify-between border-b border-solid border-white/3 pb-2.5">
              <span className="text-gray-500">Payload Limits</span>
              <span className="font-mono text-gray-300">5.00 GB (Bypassed Bun Buffer)</span>
            </div>

            <div className="flex justify-between border-b border-solid border-white/3 pb-2.5">
              <span className="text-gray-500">Registered Remotes</span>
              <span className="font-mono text-gray-300">
                {accountsLoading ? "..." : accountsList?.length ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Rclone Remote Mounts list */}
      <div className="glass-card space-y-4">
        <h3 className="text-sm font-semibold text-white tracking-wide uppercase m-0 flex items-center gap-2 border-b border-solid border-white/5 pb-4">
          <span className="i-lucide-folder-git-2 text-violet-400"></span>
          Active Remote Connections
        </h3>

        {accountsLoading ? (
          <div className="h-10 bg-white/5 rounded animate-pulse"></div>
        ) : !accountsList || accountsList.length === 0 ? (
          <p className="text-xs text-gray-500 m-0">No configured Rclone storage pools mapped.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {accountsList.map((acc) => (
              <div key={acc.id} className="glass-panel text-xs flex justify-between items-center">
                <div className="space-y-1">
                  <span className="font-semibold text-gray-200 block">{acc.name}</span>
                  <span className="font-mono text-[10px] text-gray-500">{acc.remoteName}:</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${acc.status === 'active' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                  {acc.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
