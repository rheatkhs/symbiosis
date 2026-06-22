import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { StatCard } from "../components/StatCard";
import { motion } from "framer-motion";

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
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Header section */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white m-0">System Overview</h2>
        <p className="text-xs text-slate-500 dark:text-gray-500 m-0 mt-1">Real-time status and telemetry of Symbiosis storage nodes.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Streams"
          value={stats?.activeTransfers ?? 0}
          icon="i-ri-pulse-line"
          description="Transfers actively piped to Rclone"
          loading={statsLoading}
        />
        <StatCard
          title="Aggregated Storage"
          value={formatBytes(stats?.totalStorageUsed ?? 0)}
          icon="i-ri-database-2-line"
          description="Total storage uploaded via proxy"
          loading={statsLoading}
        />
        <StatCard
          title="Registered Remotes"
          value={stats?.totalAccounts ?? 0}
          icon="i-ri-hard-drive-2-line"
          description="Active storage accounts configured"
          loading={statsLoading}
        />
        <StatCard
          title="Rclone Daemon"
          value={stats?.rcloneHealthy ? "HEALTHY" : "DOWN"}
          icon="i-ri-heart-pulse-line"
          description="Rclone RC HTTP connection status"
          loading={statsLoading}
        />
      </div>

      {/* Bottom Layout - Transfers + Quick Upload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transfers (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-brand-card/95 border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none space-y-4 transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-solid border-slate-200/80 dark:border-white/5 pb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white tracking-wide uppercase m-0 flex items-center gap-2">
              <span className="i-ri-history-line text-violet-400"></span>
              Recent Activity
            </h3>
            <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500">AUTO-REFRESH ENABLED</span>
          </div>

          {transfersLoading ? (
            <div className="space-y-3 py-4">
              <div className="h-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
              <div className="h-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
              <div className="h-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
            </div>
          ) : !transfersData?.data || transfersData.data.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-gray-500">
              No recent file transfers detected. Run an upload request to populate log.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-solid border-slate-200/80 dark:border-white/5 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
                    <th className="pb-3 pl-2">File Name</th>
                    <th className="pb-3">Size</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3 pr-2 text-right">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-solid divide-slate-200/80 dark:divide-white/5 text-xs">
                  {transfersData.data.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors">
                      <td className="py-3 pl-2 max-w-[200px] truncate font-medium text-slate-800 dark:text-gray-200" title={tx.fileName}>
                        {tx.fileName}
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-gray-400">{formatBytes(tx.fileSize)}</td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            tx.status === "completed"
                              ? "bg-green-500/10 text-green-600 dark:text-green-400"
                              : tx.status === "streaming"
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                                : tx.status === "failed"
                                  ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                  : "bg-gray-500/10 text-slate-600 dark:text-gray-400"
                          }`}
                        >
                          <span
                            className={`w-1 h-1 rounded-full ${
                              tx.status === "completed"
                                ? "bg-green-500 dark:bg-green-400"
                                : tx.status === "streaming"
                                  ? "bg-blue-500 dark:bg-blue-400 animate-ping"
                                  : tx.status === "failed"
                                    ? "bg-red-500 dark:bg-red-400"
                                    : "bg-slate-400 dark:bg-gray-400"
                            }`}
                          ></span>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 font-mono text-slate-600 dark:text-gray-400">
                        {tx.durationMs ? `${(tx.durationMs / 1000).toFixed(2)}s` : "-"}
                      </td>
                      <td className="py-3 pr-2 text-right text-[11px] text-slate-500 dark:text-gray-500 font-mono">
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
        <div className="bg-white dark:bg-brand-card/95 border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none flex flex-col justify-between transition-colors duration-300">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white tracking-wide uppercase m-0 flex items-center gap-2 border-b border-solid border-slate-200/80 dark:border-white/5 pb-4">
              <span className="i-ri-terminal-box-line text-violet-400"></span>
              Streaming Guide
            </h3>
            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed m-0">
              The Symbiosis Stream Engine acts as an instant binary proxy. Use curl, postman, or your frontend client to pipe files directly to local storage clusters:
            </p>
            <div className="bg-slate-100 dark:bg-black/40 border border-solid border-slate-200 dark:border-white/5 rounded-lg p-3 font-mono text-[10px] text-violet-600 dark:text-violet-300 overflow-x-auto whitespace-pre leading-relaxed select-all">
{`curl -X POST \\
  -H "X-File-Path: /Uploads" \\
  -H "X-File-Name: video.mp4" \\
  -T "local_file.mp4" \\
  http://localhost:3000/api/stream/upload/<remote_name>`}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-500 leading-normal m-0 italic">
              * Note: Incoming request bodies bypass RAM buffers and flow purely as standard web-streams to Rclone configs.
            </p>
          </div>

          <div className="pt-6 border-t border-solid border-slate-200/80 dark:border-white/5 mt-6 lg:mt-auto flex items-center justify-between text-xs text-slate-600 dark:text-gray-400">
            <span>Uptime Metrics</span>
            <span className="font-mono text-[11px] bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-solid border-slate-200 dark:border-white/10 text-slate-700 dark:text-gray-300">
              {statsLoading ? "..." : stats?.rcloneHealthy ? "Operational" : "Offline"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
