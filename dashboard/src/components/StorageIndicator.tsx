import React from "react";

interface StorageIndicatorProps {
  used: number;
  limit: number | null;
  onRefresh?: () => void;
  isSyncing?: boolean;
  compact?: boolean;
}

function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function StorageIndicator({
  used,
  limit,
  onRefresh,
  isSyncing = false,
  compact = false,
}: StorageIndicatorProps) {
  const percentage = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const free = limit ? Math.max(0, limit - used) : null;

  if (compact) {
    return (
      <div className="space-y-2.5 px-0.5 py-1">
        <div className="flex justify-between items-center text-[10px]">
          <span className="font-semibold text-slate-400 dark:text-gray-500 uppercase tracking-wider">Storage Capacity</span>
          {onRefresh && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              disabled={isSyncing}
              className="p-1 bg-transparent hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-brand-accent border-none rounded flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
              title="Sync space"
            >
              <span className={`i-ri-refresh-line text-[11px] ${isSyncing ? "animate-spin" : ""}`}></span>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-solid border-slate-200/20 dark:border-white/5">
          <div
            className="h-full bg-brand-accent rounded-full transition-all duration-500"
            style={{ width: `${limit ? percentage : 0}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-[9.5px] font-mono text-slate-500 dark:text-gray-500">
          <span>{formatBytes(used)}</span>
          <span>{limit ? formatBytes(limit) : "Unlimited"}</span>
        </div>
      </div>
    );
  }

  // Detailed Card view
  return (
    <div className="relative overflow-hidden bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/10 rounded-xl p-6 shadow-sm dark:shadow-none hover:border-brand-accent/30 dark:hover:border-brand-accent/20 transition-all duration-300">
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-brand-accent/5 rounded-full blur-xl"></div>
      
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <span className="text-[12px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
              Storage Pool Usage
            </span>
            <div className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white font-mono flex items-baseline gap-1">
              <span>{limit ? `${percentage}%` : formatBytes(used)}</span>
              {limit && (
                <span className="text-xs font-normal text-slate-400 dark:text-gray-500">
                  of {formatBytes(limit)} used
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                onClick={onRefresh}
                disabled={isSyncing}
                className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 border border-solid border-slate-200 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:text-brand-accent dark:hover:text-brand-accent hover:border-brand-accent/30 flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
                title="Sync space capacity"
              >
                <span className={`i-ri-refresh-line text-sm ${isSyncing ? "animate-spin" : ""}`}></span>
              </button>
            )}
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-white/5 border border-solid border-slate-200/80 dark:border-white/10 flex items-center justify-center text-slate-500 dark:text-gray-400">
              <span className="i-ri-hard-drive-3-line text-lg text-brand-accent"></span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-solid border-slate-200 dark:border-white/5">
          <div
            className="h-full bg-brand-accent rounded-full transition-all duration-500"
            style={{ width: `${limit ? percentage : 0}%` }}
          ></div>
        </div>

        {/* Substats */}
        <div className="flex justify-between items-center text-[10.5px] font-mono text-slate-500 dark:text-gray-400 pt-2 border-t border-solid border-slate-100 dark:border-white/5">
          <div>
            <span>Used: <strong className="text-slate-700 dark:text-gray-200">{formatBytes(used)}</strong></span>
          </div>
          <div>
            <span>Free: <strong className="text-slate-700 dark:text-gray-200">{free !== null ? formatBytes(free) : "Unlimited"}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
}
