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

  const { data: accountsList, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Active Streams"
          value={stats?.activeTransfers ?? 0}
          icon="i-ri-pulse-line text-violet-500"
          description="Transfers actively piped to Rclone"
          loading={statsLoading}
        />

        {/* Combined Storage Card (Professional Disk Usage View) */}
        <motion.div
          whileHover={{ y: -4, scale: 1.01 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="bg-white dark:bg-white/5 border border-solid border-slate-200/80 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none hover:border-violet-500/30 dark:hover:border-violet-500/20 group flex flex-col justify-between min-h-[140px] relative overflow-hidden transition-colors duration-300"
        >
          {/* Background radial glow */}
          <div className="absolute -right-8 -top-8 w-24 h-24 bg-violet-600/5 rounded-full blur-xl group-hover:bg-violet-600/10 transition-colors duration-300"></div>

          <div>
            <div className="flex items-start justify-between">
              <span className="text-[12px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Storage Pool</span>
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 border border-solid border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400 group-hover:text-violet-500 dark:group-hover:text-violet-400 group-hover:border-violet-500/30 transition-all">
                <span className="i-ri-hard-drive-3-line text-lg text-blue-500"></span>
              </div>
            </div>

            {statsLoading ? (
              <div className="space-y-2 mt-2">
                <div className="h-6 w-32 bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
                <div className="h-3 w-full bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
              </div>
            ) : (
              <div className="mt-2 space-y-3">
                {/* Visual Disk Line */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-800 dark:text-white">
                      {stats?.hasUnlimitedLimit 
                        ? "Used: " + formatBytes(stats?.totalStorageUsed ?? 0) 
                        : `${Math.round(((stats?.totalStorageUsed ?? 0) / (stats?.totalStorageLimit || 1)) * 100)}% Used`}
                    </span>
                    <span className="text-slate-500 dark:text-gray-500 font-mono text-[10px]">
                      {stats?.hasUnlimitedLimit ? "Unlimited" : formatBytes(stats?.totalStorageLimit ?? 0) + " Total"}
                    </span>
                  </div>
                  
                  {/* Disk progress bar */}
                  <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-solid border-slate-200 dark:border-white/5">
                    <div
                      className="h-full bg-violet-600 rounded-full transition-all duration-500"
                      style={{
                        width: stats?.hasUnlimitedLimit 
                          ? "0%" 
                          : `${Math.min(100, Math.round(((stats?.totalStorageUsed ?? 0) / (stats?.totalStorageLimit || 1)) * 100))}%`
                      }}
                    ></div>
                  </div>
                </div>

                {/* Sub stats row */}
                <div className="flex justify-between items-center text-[10.5px] font-mono text-slate-600 dark:text-gray-400 pt-1.5 border-t border-solid border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-600"></span>
                    <span>Used: {formatBytes(stats?.totalStorageUsed ?? 0)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    <span>Free: {stats?.hasUnlimitedLimit ? "Unlimited" : formatBytes(stats?.totalStorageFree ?? 0)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <StatCard
          title="Registered Remotes"
          value={stats?.totalAccounts ?? 0}
          icon="i-ri-hard-drive-2-line text-yellow-500"
          description="Active storage accounts configured"
          loading={statsLoading}
        />
        <StatCard
          title="Rclone Daemon"
          value={stats?.rcloneHealthy ? "HEALTHY" : "DOWN"}
          icon="i-ri-heart-pulse-line text-red-500"
          description="Rclone RC HTTP connection status"
          loading={statsLoading}
        />
      </div>

      {/* Bottom Layout - Storage Pools + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Storage Pools List (2/3 width) */}
        <div className="lg:col-span-2 bg-white dark:bg-brand-card/95 border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none space-y-5 transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-solid border-slate-200/80 dark:border-white/5 pb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white tracking-wide uppercase m-0 flex items-center gap-2">
              <span className="i-ri-server-line text-violet-400"></span>
              Storage Pools Status
            </h3>
            <span className="text-[10px] font-mono text-slate-400 dark:text-gray-500">AUTO-REFRESH ENABLED</span>
          </div>

          {accountsLoading ? (
            <div className="space-y-4 py-2">
              <div className="h-16 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
              <div className="h-16 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
              <div className="h-16 bg-slate-100 dark:bg-white/5 rounded-xl animate-pulse"></div>
            </div>
          ) : !accountsList || accountsList.length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 dark:text-gray-500">
              No registered storage accounts found. Create one in the Remotes view.
            </div>
          ) : (
            <div className="space-y-4">
              {accountsList.map((account) => {
                const usagePercentage = account.storageLimit
                  ? Math.min(100, Math.round((account.storageUsed / account.storageLimit) * 100))
                  : 0;

                return (
                  <div
                    key={account.id}
                    className="p-4 rounded-xl border border-solid border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/1 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:bg-slate-50 dark:hover:bg-white/2"
                  >
                    {/* Remote Info */}
                    <div className="flex items-center gap-3 min-w-[200px]">
                      {/* Pulse Indicator */}
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>

                      {/* Icon */}
                      <div className="w-8 h-8 rounded-lg bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0">
                        <span className="i-ri-google-fill text-base"></span>
                      </div>

                      <div>
                        <h4 className="text-xs font-semibold text-slate-800 dark:text-white m-0">{account.name}</h4>
                        <span className="text-[10px] font-mono text-slate-500 dark:text-gray-500">
                          {account.remoteName}:
                        </span>
                      </div>
                    </div>

                    {/* Partition Space Bar */}
                    <div className="flex-1 max-w-md space-y-1.5">
                      <div className="flex justify-between text-[11px]">
                        <span className="font-medium text-slate-700 dark:text-gray-300">
                          {account.storageLimit ? `${usagePercentage}% Used` : "Used"}
                        </span>
                        <span className="text-slate-500 dark:text-gray-500 font-mono">
                          {formatBytes(account.storageUsed)} of {account.storageLimit ? formatBytes(account.storageLimit) : "Unlimited"}
                        </span>
                      </div>

                      {/* Storage line progress bar */}
                      <div className="w-full h-1.5 bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-violet-600 rounded-full transition-all duration-500"
                          style={{ width: `${account.storageLimit ? usagePercentage : 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Meta stats */}
                    <div className="text-right text-[10.5px] font-mono text-slate-600 dark:text-gray-400 min-w-[120px]">
                      <div>Free Space:</div>
                      <div className="font-bold text-slate-800 dark:text-white mt-0.5">
                        {account.storageLimit ? formatBytes(Math.max(0, account.storageLimit - account.storageUsed)) : "Unlimited"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Feed (1/3 width) */}
        <div className="bg-white dark:bg-brand-card/95 border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none space-y-5 transition-colors duration-300">
          <div className="flex items-center justify-between border-b border-solid border-slate-200/80 dark:border-white/5 pb-4">
            <h3 className="text-sm font-semibold text-slate-800 dark:text-white tracking-wide uppercase m-0 flex items-center gap-2">
              <span className="i-ri-history-line text-violet-400"></span>
              Recent Activity
            </h3>
          </div>

          {transfersLoading ? (
            <div className="space-y-3 py-2">
              <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse"></div>
              <div className="h-12 bg-slate-100 dark:bg-white/5 rounded-lg animate-pulse"></div>
            </div>
          ) : !transfersData?.data || transfersData.data.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500 dark:text-gray-500">
              No streaming uploads recorded.
            </div>
          ) : (
            <div className="space-y-3">
              {transfersData.data.map((tx) => (
                <div 
                  key={tx.id} 
                  className="flex items-start gap-3 p-3 rounded-lg border border-solid border-slate-100 dark:border-white/5 bg-slate-50/20 dark:bg-white/0 hover:bg-slate-50/50 dark:hover:bg-white/1 transition-all"
                >
                  {/* Status Indicator Icon */}
                  <div className="mt-0.5">
                    {tx.status === "completed" ? (
                      <span className="i-ri-checkbox-circle-fill text-green-500 text-base block"></span>
                    ) : tx.status === "streaming" ? (
                      <span className="i-ri-loader-4-line animate-spin text-blue-500 text-base block"></span>
                    ) : tx.status === "failed" ? (
                      <span className="i-ri-error-warning-fill text-red-500 text-base block"></span>
                    ) : (
                      <span className="i-ri-time-line text-slate-400 text-base block"></span>
                    )}
                  </div>

                  {/* Transfer Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-800 dark:text-gray-200 truncate m-0" title={tx.fileName}>
                      {tx.fileName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-gray-500 mt-1 font-mono">
                      <span>{formatBytes(tx.fileSize)}</span>
                      <span>•</span>
                      <span>{tx.durationMs ? `${(tx.durationMs / 1000).toFixed(1)}s` : "streaming"}</span>
                    </div>
                  </div>

                  {/* Time */}
                  <div className="text-[10px] text-slate-400 dark:text-gray-500 font-mono">
                    {new Date(tx.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
