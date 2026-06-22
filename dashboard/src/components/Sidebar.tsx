import { Link } from "@tanstack/react-router";

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
    <aside className={`w-64 bg-brand-card/95 lg:bg-brand-card/60 backdrop-blur-xl lg:backdrop-blur-md border-r border-solid border-white/5 flex flex-col h-screen fixed lg:sticky top-0 left-0 z-40 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
      {/* Brand Header */}
      <div className="p-6 border-b border-solid border-white/5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-solid border-violet-500/30 flex items-center justify-center text-violet-400 font-bold">
            <span className="i-ri-dna-line text-xl"></span>
          </div>
          <div>
            <h1 className="text-sm font-semibold tracking-wider uppercase text-white m-0">Symbiosis</h1>
            <span className="text-[10px] text-gray-500 font-mono tracking-widest">STREAM ENGINE</span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border-none text-gray-400 hover:text-white flex items-center justify-center cursor-pointer transition-all"
        >
          <span className="i-ri-close-line text-lg"></span>
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-4 space-y-1.5">
        {navItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            onClick={onClose}
            activeProps={{
              className: "bg-violet-600/10 border-solid border-l-2 border-l-violet-500 text-violet-200",
            }}
            inactiveProps={{
              className: "text-gray-400 hover:bg-white/3 hover:text-white border-l-2 border-solid border-l-transparent",
            }}
            className="flex items-center gap-3.5 px-4.5 py-3 rounded-lg text-[14px] font-medium tracking-wide transition-all no-underline"
          >
            <span className={`${item.icon} text-lg`}></span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* Footer / Health Status */}
      <div className="p-4 border-t border-solid border-white/5 text-[11px] text-gray-500 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
          <span>Engine Status: Online</span>
        </div>
        <span className="font-mono">v1.0.0-rc1</span>
      </div>
    </aside>
  );
}
