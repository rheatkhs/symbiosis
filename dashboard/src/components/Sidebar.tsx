import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const navItems = [
    { to: "/", label: "Dashboard", icon: "i-ri-dashboard-line" },
    { to: "/accounts", label: "Accounts", icon: "i-ri-database-2-line" },
    { to: "/uploads", label: "Uploads", icon: "i-ri-pulse-line" },
    { to: "/settings", label: "Settings", icon: "i-ri-settings-3-line" },
  ];

  return (
    <aside className={`w-64 bg-white dark:bg-brand-card/95 border-r border-solid border-slate-200/80 dark:border-white/5 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-40 transition-all duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-solid border-slate-200/80 dark:border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-solid border-violet-500/30 flex items-center justify-center text-violet-500 dark:text-violet-400 font-bold">
            <span className="i-ri-dna-line text-xl"></span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider uppercase text-slate-800 dark:text-white m-0">Symbiosis</h1>
            <span className="text-[10px] text-slate-400 dark:text-gray-500 font-mono tracking-widest">STREAM ENGINE</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-none text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-all"
        >
          <span className="i-ri-close-line text-lg"></span>
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => (
          <motion.div
            key={item.to}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <Link
              to={item.to}
              onClick={onClose}
              activeProps={{
                className: "bg-violet-600/10 border-solid border-l-2 border-l-violet-500 text-violet-600 dark:text-violet-200",
              }}
              inactiveProps={{
                className: "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-white border-l-2 border-solid border-l-transparent",
              }}
              className="flex items-center gap-3.5 px-4.5 py-3 rounded-lg text-[14px] font-medium tracking-wide transition-all no-underline"
            >
              <span className={`${item.icon} text-lg`}></span>
              {item.label}
            </Link>
          </motion.div>
        ))}
      </nav>

      {/* Footer / Health Status */}
      <div className="p-4 border-t border-solid border-slate-200/80 dark:border-white/5 text-[11px] text-slate-500 dark:text-gray-500 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Engine Status: Online</span>
        </div>
        <span className="font-mono">v1.0.0-rc1</span>
      </div>
    </aside>
  );
}
