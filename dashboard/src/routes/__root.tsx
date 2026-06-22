import { useState } from "react";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "../components/Sidebar";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-brand-dark text-gray-200">
      {/* Sidebar overlay backdrop for mobile */}
      {isSidebarOpen && (
        <div
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm lg:hidden transition-all duration-300"
        />
      )}

      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="h-16 border-b border-solid border-white/5 bg-brand-dark/20 backdrop-blur-md sticky top-0 z-10 px-4 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Hamburger menu button for mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border-solid border-1 border-white/10 text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-all active:scale-95"
            >
              <span className="i-ri-menu-line text-lg"></span>
            </button>
            <div className="text-sm font-medium text-gray-300 flex items-center gap-2">
              <span className="i-ri-pulse-line text-violet-400 animate-pulse"></span>
              Symbiosis Proxy Hub
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono bg-white/5 px-2.5 py-1 rounded-full border border-solid border-white/10 text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              RC CONNECTED
            </span>
          </div>
        </header>
        <div className="flex-1 p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
