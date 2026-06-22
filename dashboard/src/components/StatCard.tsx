interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  description: string;
  loading?: boolean;
}

export function StatCard({ title, value, icon, description, loading }: StatCardProps) {
  return (
    <div className="glass-card hover:border-violet-500/20 transition-all duration-300 group flex flex-col justify-between min-h-[120px] relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-violet-600/5 rounded-full blur-xl group-hover:bg-violet-600/10 transition-colors duration-300"></div>

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[12px] font-semibold text-gray-500 uppercase tracking-wider">{title}</span>
          {loading ? (
            <div className="h-8 w-28 bg-white/5 rounded animate-pulse my-1"></div>
          ) : (
            <span className="text-2xl font-bold tracking-tight text-white font-mono">{value}</span>
          )}
        </div>
        <div className="w-10 h-10 rounded-lg bg-white/5 border border-solid border-white/10 flex items-center justify-center text-gray-400 group-hover:text-violet-400 group-hover:border-violet-500/30 transition-all">
          <span className={`${icon} text-lg`}></span>
        </div>
      </div>

      <div className="mt-4 text-[11px] text-gray-400 flex items-center gap-1">
        <span className="i-lucide-info text-[12px] text-gray-500"></span>
        {description}
      </div>
    </div>
  );
}
