import React from "react";
import { type Account } from "../lib/api";
import { StorageIndicator } from "./StorageIndicator";

interface RemoteCardProps {
  account: Account;
  onBrowse: (account: Account) => void;
  onEdit: (account: Account) => void;
  onDelete: (id: string, name: string) => void;
  onSync: (accountId: string) => void;
  isSyncing: boolean;
}

export function RemoteCard({
  account,
  onBrowse,
  onEdit,
  onDelete,
  onSync,
  isSyncing,
}: RemoteCardProps) {
  const usagePercentage = account.storageLimit
    ? Math.min(100, Math.round((account.storageUsed / account.storageLimit) * 100))
    : 0;

  return (
    <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none flex flex-col justify-between h-44 relative hover:border-brand-accent/30 dark:hover:border-brand-accent/20 transition-all duration-300">
      <div>
        {/* Account Header */}
        <div className="flex items-start justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-white m-0 leading-tight">
              {account.name}
            </h4>
            <span className="text-[10px] font-mono text-brand-accent uppercase tracking-widest mt-1 block font-semibold">
              {account.provider}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onBrowse(account)}
              className="w-7 h-7 bg-blue-50 dark:bg-blue-950/20 hover:bg-brand-accent dark:hover:bg-brand-accent hover:border-brand-accent border border-solid border-blue-200 dark:border-brand-accent/20 text-brand-accent hover:text-white rounded transition-all flex items-center justify-center cursor-pointer"
              title="Browse Files & Upload"
            >
              <span className="i-ri-folder-shield-line text-[13px]"></span>
            </button>
            <button
              onClick={() => onEdit(account)}
              className="w-7 h-7 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded border border-solid border-slate-200 dark:border-white/5 text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition-all flex items-center justify-center cursor-pointer"
              title="Edit Account"
            >
              <span className="i-ri-edit-line text-[13px]"></span>
            </button>
            <button
              onClick={() => onDelete(account.id, account.name)}
              className="w-7 h-7 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900 border border-solid border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 hover:text-white rounded transition-all flex items-center justify-center cursor-pointer"
              title="Delete Account"
            >
              <span className="i-ri-delete-bin-line text-[13px]"></span>
            </button>
          </div>
        </div>

        {/* Remote Mapping Info */}
        <div className="mt-4 flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 dark:text-gray-500">Rclone Target:</span>
          <span className="text-[11px] font-mono bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded border border-solid border-slate-200 dark:border-white/5 text-slate-700 dark:text-gray-300">
            {account.remoteName}:
          </span>
        </div>
      </div>

      {/* Progress / Storage Stats */}
      <div className="mt-4 space-y-1.5">
        <div className="flex justify-between text-[11px] text-slate-600 dark:text-gray-400 font-mono items-center">
          <div className="flex items-center gap-1">
            <span>Used: {formatBytes(account.storageUsed)}</span>
            <button
              onClick={() => onSync(account.id)}
              disabled={isSyncing}
              className="w-3.5 h-3.5 rounded bg-transparent hover:bg-slate-200 dark:hover:bg-white/5 text-slate-400 hover:text-slate-800 dark:hover:text-white border-none flex items-center justify-center cursor-pointer transition-all disabled:opacity-30"
              title="Refresh actual remote size"
            >
              <span className={`i-ri-refresh-line text-[10px] ${isSyncing ? "animate-spin" : ""}`}></span>
            </button>
          </div>
          <span>
            {account.storageLimit
              ? `${usagePercentage}% of ${formatBytes(account.storageLimit)}`
              : "Unlimited"}
          </span>
        </div>
        {account.storageLimit && (
          <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden border border-solid border-slate-200 dark:border-white/5">
            <div
              className="h-full bg-brand-accent rounded-full transition-all duration-500"
              style={{ width: `${usagePercentage}%` }}
            ></div>
          </div>
        )}
      </div>
    </div>
  );
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
