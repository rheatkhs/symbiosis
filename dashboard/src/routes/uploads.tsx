import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/uploads")({
  component: UploadsPage,
});

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function UploadsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [statusFilter, setStatusFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");

  const { data: accountsList } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
  });

  const { data: transfersData, isLoading } = useQuery({
    queryKey: ["transfers", page, statusFilter, accountFilter],
    queryFn: () =>
      api.getTransfers({
        page,
        limit,
        status: statusFilter || undefined,
        accountId: accountFilter || undefined,
      }),
    refetchInterval: 5000,
  });

  const totalPages = transfersData ? Math.ceil(transfersData.total / limit) : 0;

  const handleStatusChange = (val: string) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleAccountChange = (val: string) => {
    setAccountFilter(val);
    setPage(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Page Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white m-0">Transfer Logs</h2>
        <p className="text-xs text-slate-500 dark:text-gray-500 m-0 mt-1">Audit trail and status logs of all file uploads piped through the engine.</p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none flex flex-col md:flex-row gap-4 items-center justify-between transition-colors duration-300">
        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex flex-col gap-1 w-full md:w-48">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Filter Status</label>
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="input-field bg-slate-100 dark:bg-brand-dark"
            >
              <option value="">All Statuses</option>
              <option value="streaming">Streaming</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Account Filter */}
          <div className="flex flex-col gap-1 w-full md:w-56">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-500">Filter Remote</label>
            <select
              value={accountFilter}
              onChange={(e) => handleAccountChange(e.target.value)}
              className="input-field bg-slate-100 dark:bg-brand-dark"
            >
              <option value="">All Remotes</option>
              {accountsList?.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.remoteName}:)
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setStatusFilter("");
            setAccountFilter("");
            setPage(1);
          }}
          className="btn-secondary w-full md:w-auto self-end md:self-center"
        >
          <span className="i-ri-refresh-line"></span>
          Reset Filters
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-brand-card border border-solid border-slate-200/80 dark:border-white/5 rounded-xl p-6 shadow-sm dark:shadow-none transition-colors duration-300">
        {isLoading ? (
          <div className="space-y-3 py-6">
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
            <div className="h-10 bg-slate-100 dark:bg-white/5 rounded animate-pulse"></div>
          </div>
        ) : !transfersData?.data || transfersData.data.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500 dark:text-gray-500">
            No matching transfer records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-solid border-slate-200/80 dark:border-white/5 text-[11px] font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">
                  <th className="pb-3 pl-2">File Name</th>
                  <th className="pb-3">Path</th>
                  <th className="pb-3">Remote ID</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Duration</th>
                  <th className="pb-3 pr-2 text-right">Started At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-solid divide-slate-200/80 dark:divide-white/5 text-xs">
                <AnimatePresence mode="popLayout">
                  {transfersData.data.map((tx) => (
                    <motion.tr
                      key={tx.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="hover:bg-slate-50 dark:hover:bg-white/2 transition-colors"
                    >
                      <td className="py-3.5 pl-2 max-w-[200px] truncate font-medium text-slate-800 dark:text-gray-200" title={tx.fileName}>
                        {tx.fileName}
                      </td>
                      <td className="py-3.5 max-w-[250px] truncate text-slate-500 dark:text-gray-400 font-mono text-[11px]" title={tx.filePath}>
                        {tx.filePath}
                      </td>
                      <td className="py-3.5 text-slate-500 dark:text-gray-400 font-mono text-[11px]">
                        {accountsList?.find((a) => a.id === tx.accountId)?.name || tx.accountId.slice(0, 8)}
                      </td>
                      <td className="py-3.5 font-mono text-slate-600 dark:text-gray-400">{formatBytes(tx.fileSize)}</td>
                      <td className="py-3.5">
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
                        {tx.error && (
                          <p className="text-[10px] text-red-500 dark:text-red-400/80 m-0 mt-1 max-w-[200px] truncate" title={tx.error}>
                            {tx.error}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 font-mono text-slate-600 dark:text-gray-400">
                        {tx.durationMs ? `${(tx.durationMs / 1000).toFixed(2)}s` : "-"}
                      </td>
                      <td className="py-3.5 pr-2 text-right text-[11px] text-slate-500 dark:text-gray-500 font-mono">
                        {new Date(tx.startedAt).toLocaleString()}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {transfersData && transfersData.total > limit && (
          <div className="flex items-center justify-between border-t border-solid border-slate-200/80 dark:border-white/5 pt-4 mt-6">
            <span className="text-[11px] text-slate-500 dark:text-gray-500">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, transfersData.total)} of {transfersData.total} items
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="btn-secondary py-1 px-3 disabled:opacity-30 disabled:cursor-not-allowed text-[11px]"
              >
                Previous
              </button>
              <span className="text-xs text-slate-600 dark:text-gray-400 font-mono">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="btn-secondary py-1 px-3 disabled:opacity-30 disabled:cursor-not-allowed text-[11px]"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
