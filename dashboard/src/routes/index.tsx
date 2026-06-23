import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: DashboardOverview,
});

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function DashboardOverview() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: api.getStats,
    refetchInterval: 5000,
  });

  const { data: accountsList, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
  });

  const { data: transfersData, isLoading: transfersLoading } = useQuery({
    queryKey: ["recentTransfers"],
    queryFn: () => api.getTransfers({ limit: 6 }),
    refetchInterval: 3000,
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-6"
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-solid border-slate-200 dark:border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white m-0">Dashboard</h2>
          <p className="text-xs text-slate-500 dark:text-gray-500 m-0 mt-1">
            Real-time proxy pipelines, storage consolidation, and remote analytics.
          </p>
        </div>
      </div>

      {/* Grid: 4 Telemetry Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Rclone Daemon Status */}
        <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-5 shadow-sm dark:shadow-none flex items-center gap-4 transition-colors duration-300">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
            <span className="i-ri-server-line text-lg"></span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider">Engine Status</span>
            <div className={`text-sm font-bold mt-0.5 ${stats?.rcloneHealthy ? "text-emerald-600 dark:text-emerald-500" : "text-red-500"}`}>
              {stats?.rcloneHealthy ? "ONLINE" : "OFFLINE"}
            </div>
          </div>
        </div>

        {/* Total Storage Used */}
        <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-5 shadow-sm dark:shadow-none flex items-center gap-4 transition-colors duration-300">
          <div className="w-10 h-10 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center">
            <span className="i-ri-hard-drive-2-line text-lg"></span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider">Consolidated Space</span>
            <div className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 font-mono">
              {statsLoading ? "Loading..." : stats ? formatBytes(stats.totalStorageUsed) : "0 B"}
            </div>
          </div>
        </div>

        {/* Active Streams */}
        <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-5 shadow-sm dark:shadow-none flex items-center gap-4 transition-colors duration-300">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
            <span className="i-ri-pulse-line text-lg"></span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider">Active Streams</span>
            <div className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 font-mono">
              {statsLoading ? "..." : stats?.activeTransfers ?? 0} uploads
            </div>
          </div>
        </div>

        {/* Total Remotes */}
        <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-5 shadow-sm dark:shadow-none flex items-center gap-4 transition-colors duration-300">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-500 flex items-center justify-center">
            <span className="i-ri-cloud-line text-lg"></span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider">Cloud Integrations</span>
            <div className="text-sm font-bold text-slate-800 dark:text-white mt-0.5 font-mono">
              {accountsLoading ? "..." : accountsList?.length ?? 0} mounts
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left detailed capacity, Right Transfers feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3 width) - Remote Storage breakdown */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none space-y-4">
            <div className="flex items-center justify-between border-b border-solid border-slate-200/80 dark:border-white/5 pb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase m-0 flex items-center gap-2">
                <span className="i-ri-pie-chart-line text-brand-accent"></span>
                Storage Allocations
              </h3>
              <Link to="/files" className="text-[10.5px] text-brand-accent hover:underline no-underline font-semibold flex items-center gap-1">
                Browse Files
                <span className="i-ri-arrow-right-line"></span>
              </Link>
            </div>

            {accountsLoading ? (
              <div className="space-y-4 py-4">
                <div className="h-16 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
                <div className="h-16 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
              </div>
            ) : !accountsList || accountsList.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-gray-500">
                <span className="i-ri-cloud-off-line text-3xl block mx-auto mb-2.5"></span>
                No connected cloud remotes yet.
                <Link to="/accounts" className="text-brand-accent hover:underline block mt-2 font-semibold">
                  Link your first account
                </Link>
              </div>
            ) : (
              <div className="space-y-5">
                {accountsList.map((account) => (
                  <div key={account.id} className="space-y-2.5">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
                        <span className="i-ri-google-fill text-brand-accent text-sm"></span>
                        <span>{account.name}</span>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">({account.remoteName}:)</span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-500 dark:text-gray-400">
                        {formatBytes(account.storageUsed)} of {account.storageLimit ? formatBytes(account.storageLimit) : "Unlimited"}
                      </span>
                    </div>
                    {/* Render indicator directly */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-solid border-slate-200/20 dark:border-white/5">
                      <div
                        className="h-full bg-brand-accent rounded-full transition-all duration-500"
                        style={{
                          width: `${
                            account.storageLimit
                              ? Math.min(100, Math.round((account.storageUsed / account.storageLimit) * 100))
                              : 0
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (1/3 width) - Live Pipeline & Host Metrics */}
        <div className="space-y-6">
          
          {/* Live Pipeline Feed */}
          <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-5 shadow-sm dark:shadow-none space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white tracking-wider uppercase m-0 flex items-center gap-2 border-b border-solid border-slate-200/80 dark:border-white/5 pb-2.5">
              <span className="i-ri-pulse-fill text-brand-accent animate-pulse"></span>
              Live Pipeline
            </h3>

            {transfersLoading ? (
              <div className="space-y-3 py-1">
                <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse"></div>
                <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse"></div>
                <div className="h-11 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse"></div>
              </div>
            ) : !transfersData?.data || transfersData.data.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 dark:text-gray-500 font-medium">
                No active transfer uploads.
              </div>
            ) : (
              <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
                {transfersData.data.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-solid border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/1 hover:bg-slate-100/50 dark:hover:bg-white/2 transition-all text-xs"
                  >
                    <div className="mt-0.5 flex-shrink-0">
                      {tx.status === "completed" ? (
                        <span className="i-ri-checkbox-circle-fill text-emerald-500 text-sm block"></span>
                      ) : tx.status === "streaming" ? (
                        <span className="i-ri-loader-4-line animate-spin text-brand-accent text-sm block"></span>
                      ) : tx.status === "failed" ? (
                        <span className="i-ri-error-warning-fill text-red-500 text-sm block"></span>
                      ) : (
                        <span className="i-ri-time-line text-slate-400 text-sm block"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 dark:text-gray-200 truncate m-0 leading-tight">
                        {tx.fileName}
                      </p>
                      <div className="flex items-center gap-1 text-[9.5px] text-slate-500 dark:text-gray-500 mt-1 font-mono">
                        <span>{formatBytes(tx.fileSize)}</span>
                        <span>•</span>
                        <span>{tx.durationMs ? `${(tx.durationMs / 1000).toFixed(1)}s` : "streaming"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Engine Telemetry */}
          <div className="bg-slate-50 dark:bg-white/3 border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-4 text-xs space-y-3">
            <span className="font-bold text-slate-700 dark:text-gray-300 block uppercase tracking-wider text-[10px]">
              Connection Telemetry
            </span>
            <div className="space-y-2 font-mono text-[10.5px] text-slate-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Rclone Endpoint</span>
                <span className="font-semibold text-slate-800 dark:text-white">127.0.0.1:5572</span>
              </div>
              <div className="flex justify-between">
                <span>Proxy Daemon</span>
                <span className="font-semibold text-emerald-500">RUNNING</span>
              </div>
              <div className="flex justify-between">
                <span>Piped Buffer</span>
                <span className="font-semibold text-brand-accent">0-RAM BYPASS</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
