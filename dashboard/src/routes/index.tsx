import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { StatCard } from "../components/StatCard";

export const Route = createFileRoute("/")({
  component: DashboardOverview,
});

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function DashboardOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: api.getStats,
    refetchInterval: 5000,
  });

  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ["recentTransfers"],
    queryFn: () => api.getTransfers({ limit: 5 }),
    refetchInterval: 5000,
  });

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white m-0">System Overview</h2>
        <p className="text-xs text-gray-500 m-0 mt-1">Real-time status and telemetry of Symbiosis storage nodes.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Streams"
          value={stats?.activeTransfers ?? 0}
          icon="i-lucide-activity"
          description="Transfers actively piped to Rclone"
          loading={statsLoading}
        />
        <StatCard
          title="Aggregated Storage"
          value={formatBytes(stats?.totalStorageUsed ?? 0)}
          icon="i-lucide-database"
          description="Total storage uploaded via proxy"
          loading={statsLoading}
        />
        <StatCard
          title="Registered Remotes"
          value={stats?.totalAccounts ?? 0}
          icon="i-lucide-hard-drive"
          description="Active storage accounts configured"
          loading={statsLoading}
        />
        <StatCard
          title="Rclone Daemon"
          value={stats?.rcloneHealthy ? "HEALTHY" : "DOWN"}
          icon="i-lucide-heart-pulse"
          description="Rclone RC HTTP connection status"
          loading={statsLoading}
        />
      </div>

      {/* Bottom Layout - Transfers + Quick Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transfers (2/3 width) */}
        <div className="lg:col-span-2 glass-card space-y-4">
          <div className="flex items-center justify-between border-b border-solid border-white/5 pb-4">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase m-0 flex items-center gap-2">
              <span className="i-lucide-history text-violet-400"></span>
              Recent Activity
            </h3>
            <span className="text-[10px] font-mono text-gray-500">AUTO-REFRESH ENABLED</span>
          </div>

          {transfersLoading ? (
            <div className="space-y-3 py-4">
              <div className="h-10 bg-white/5 rounded animate-pulse"></div>
              <div className="h-10 bg-white/5 rounded animate-pulse"></div>
              <div className="h-10 bg-white/5 rounded animate-pulse"></div>
            </div>
          ) : !transfersData?.data || transfersData.data.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-500">
              No recent file transfers detected. Run an upload request to populate log.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-white/5 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pl-2">File Name</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3 pr-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-solid divide-white/5 text-xs">
                  {transfersData.data.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                      <td className="py-3 pl-2 max-w-[200px] truncate font-medium text-gray-200" title={tx.fileName}>
                        {tx.fileName}
                      </td>
                      <td className="py-3 font-mono text-gray-400">{formatBytes(tx.fileSize)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.status === "completed"
                              ? "bg-green-500/10 text-green-400"
                              : tx.status === "streaming"
                                ? "bg-blue-500/10 text-blue-400"
                                : tx.status === "failed"
                                  ? "bg-red-500/10 text-red-400"
                                  : "bg-gray-500/10 text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              tx.status === "completed"
                                ? "bg-green-400"
                                : tx.status === "streaming"
                                  ? "bg-blue-400 animate-ping"
                                  : tx.status === "failed"
                                    ? "bg-red-400"
                                    : "bg-gray-400"
                            }`}
                          ></span>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-gray-400">
                        {tx.durationMs ? `${(tx.durationMs / 1000).toFixed(2)}s` : "-"}
                      </td>
                      <td className="py-3 pr-2 text-right text-[11px] text-gray-500 font-mono">
                        {new Date(tx.startedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Instructions / Info Panel (1/3 width) */}
        <div className="glass-card flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white tracking-wide uppercase m-0 flex items-center gap-2 border-b border-solid border-white/5 pb-4">
              <span className="i-lucide-terminal text-violet-400"></span>
              Streaming Guide
            </h3>
            <p className="text-xs text-gray-400 leading-relaxed m-0">
              The Symbiosis Stream Engine acts as an instant binary proxy. Use curl, postman, or your frontend client to pipe files directly to local storage clusters:
            </p>
            <div className="bg-black/40 border border-solid border-white/5 rounded-lg p-3 font-mono text-[10px] text-violet-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
{`curl -X POST \\
  -H "X-File-Path: /Uploads" \\
  -H "X-File-Name: video.mp4" \\
  -T "local_file.mp4" \\
  http://localhost:3000/api/stream/upload/<remote_name>`}
            </div>
            <p className="text-[11px] text-gray-500 leading-normal m-0 italic">
              * Note: Incoming request bodies bypass RAM buffers and flow purely as standard web-streams to Rclone configs.
            </p>
          </div>

          <div className="pt-6 border-t border-solid border-white/5 mt-auto flex items-center justify-between text-xs text-gray-400">
            <span>Uptime Metrics</span>
            <span className="font-mono text-[11px] bg-white/5 px-2 py-0.5 rounded border border-solid border-white/10 text-gray-300">
              {statsLoading ? "..." : stats?.rcloneHealthy ? "Operational" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
