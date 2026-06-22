import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Sidebar } from "../components/Sidebar";

export const Route = createRootRoute({
  component: () => (
    <div className="flex min-h-screen bg-brand-dark text-gray-200">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <header className="h-16 border-b border-solid border-white/5 bg-brand-dark/20 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <span className="i-lucide-activity text-violet-400 animate-pulse"></span>
            Symbiosis Proxy Hub
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] font-mono bg-white/5 px-2.5 py-1 rounded-full border border-solid border-white/10 text-gray-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              RC CONNECTED
            </span>
          </div>
        </header>
        <div className="flex-1 p-8">
          <Outlet />
        </div>
      </main>
    </div>
  ),
});
