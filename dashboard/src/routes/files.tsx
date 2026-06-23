import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { FileExplorer } from "../components/FileExplorer";
import { motion } from "framer-motion";

export const Route = createFileRoute("/files")({
  component: FilesView,
});

function FilesView() {
  const { data: accountsList, isLoading: accountsLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: api.getAccounts,
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
          <h2 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white m-0">All Files</h2>
          <p className="text-xs text-slate-500 dark:text-gray-500 m-0 mt-1">Manage, upload, and browse your files across consolidated storage remotes.</p>
        </div>
      </div>

      {/* File Explorer Container */}
      {accountsLoading ? (
        <div className="bg-white dark:bg-brand-card border border-solid border-slate-200 dark:border-white/5 rounded-xl h-[580px] animate-pulse flex items-center justify-center">
          <div className="text-center space-y-3">
            <span className="i-ri-loader-4-line animate-spin text-4xl text-brand-accent block mx-auto"></span>
            <span className="text-xs text-slate-500">Retrieving storage endpoints...</span>
          </div>
        </div>
      ) : (
        <FileExplorer accounts={accountsList || []} />
      )}
    </motion.div>
  );
}
