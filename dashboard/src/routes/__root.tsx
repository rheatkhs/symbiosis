import { useState, useEffect } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "../components/Sidebar";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "dark";
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-800 dark:bg-brand-dark dark:text-gray-200 transition-colors duration-300">
      {/* Sidebar overlay backdrop for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="h-16 border-b border-solid border-slate-200/80 dark:border-white/5 bg-white/70 dark:bg-brand-dark/20 backdrop-blur-md sticky top-0 z-10 px-4 lg:px-8 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border-solid border-1 border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <span className="i-ri-menu-line text-lg"></span>
            </button>
            <div className="text-sm font-medium text-slate-700 dark:text-gray-300 flex items-center gap-2">
              <span className="i-ri-pulse-line text-violet-400 animate-pulse"></span>
              Symbiosis Proxy Hub
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-full border border-solid border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              RC CONNECTED
            </span>
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-solid border-slate-200/80 dark:border-white/10 text-slate-600 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className={theme === "dark" ? "i-ri-sun-line text-sm" : "i-ri-moon-line text-sm"}></span>
            </button>
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
