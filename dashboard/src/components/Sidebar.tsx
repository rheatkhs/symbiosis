import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { StorageIndicator } from "./StorageIndicator";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const queryClient = useQueryClient();

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["dashboardStats"],
    queryFn: api.getStats,
    refetchInterval: 10000,
  });

  const navItems = [
    { to: "/", label: "Dashboard", icon: "i-ri-dashboard-line" },
    { to: "/files", label: "All Files", icon: "i-ri-folder-shared-line" },
    { to: "/accounts", label: "Remotes", icon: "i-ri-cloud-line" },
    { to: "/uploads", label: "Transfers", icon: "i-ri-arrow-up-down-line" },
    { to: "/settings", label: "Settings", icon: "i-ri-settings-3-line" },
  ];

  const handleSyncStats = async () => {
    await queryClient.invalidateQueries({ queryKey: ["dashboardStats"] });
  };

  return (
    <aside className={`w-60 bg-white dark:bg-[#07070b] border-r border-solid border-slate-100 dark:border-white/5 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-40 transition-all duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Minimal Brand Logo */}
      <div className="p-6 pb-8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-accent/10 flex items-center justify-center text-brand-accent font-bold">
            <span className="i-ri-box-3-line text-base"></span>
          </div>
          <div>
            <h1 className="text-xs font-extrabold tracking-wider uppercase text-slate-800 dark:text-white m-0">Symbiosis</h1>
            <span className="text-[9px] text-slate-400 dark:text-gray-500 font-mono tracking-widest font-medium uppercase mt-0.5 block">Drive Engine</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-none text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-all"
        >
          <span className="i-ri-close-line text-base"></span>
        </button>
      </div>

      {/* Modern, Low-profile Nav Links */}
      <nav className="flex-1 px-4 space-y-1 select-none">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            activeProps={{
              className: "bg-slate-100/80 dark:bg-white/4 text-brand-accent font-semibold",
            }}
            inactiveProps={{
              className: "text-slate-500 hover:bg-slate-50 dark:text-gray-400 dark:hover:bg-white/2 dark:hover:text-white",
            }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all no-underline"
          >
            <span className={`${item.icon} text-base`}></span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Storage progress stats (minimal inline design) */}
      {!statsLoading && stats && (
        <div className="px-5 py-4 border-t border-solid border-slate-100 dark:border-white/5">
          <StorageIndicator
            used={stats.totalStorageUsed}
            limit={stats.hasUnlimitedLimit ? null : stats.totalStorageLimit}
            compact={true}
            onRefresh={handleSyncStats}
            isSyncing={statsLoading}
          />
        </div>
      )}
    </aside>
  );
}
