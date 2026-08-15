export function SecurityMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="glass-panel p-6 border-l-4 border-l-violet-500">
      <h2 className="text-xl font-display font-bold text-white mb-4">Security Overview</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0D1326]/40 p-4 rounded-xl border border-white/[.04] text-center">
          <p className="text-[#8891B0] text-[10px] uppercase tracking-wider font-semibold">Total Incidents</p>
          <p className="text-3xl font-display font-bold text-white mt-1">{data.total}</p>
        </div>
        <div className="bg-rose-500/10 p-4 rounded-xl text-center border border-rose-500/20">
          <p className="text-rose-400 text-[10px] uppercase tracking-wider font-semibold">Critical</p>
          <p className="text-3xl font-display font-bold text-rose-500 mt-1">{data.critical}</p>
        </div>
        <div className="bg-amber-500/10 p-4 rounded-xl text-center border border-amber-500/20">
          <p className="text-amber-400 text-[10px] uppercase tracking-wider font-semibold">Open</p>
          <p className="text-3xl font-display font-bold text-amber-500 mt-1">{data.open}</p>
        </div>
        <div className="bg-emerald-500/10 p-4 rounded-xl text-center border border-emerald-500/20">
          <p className="text-emerald-400 text-[10px] uppercase tracking-wider font-semibold">Resolved</p>
          <p className="text-3xl font-display font-bold text-emerald-500 mt-1">{data.resolved}</p>
        </div>
      </div>
      
      {/* Simple progress bar visualization for resolution rate */}
      <div className="mt-6">
        <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold mb-2">
          <span className="text-[#8891B0]">Resolution Rate</span>
          <span className="text-emerald-400">{data.total > 0 ? ((data.resolved / data.total) * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="w-full bg-white/[.04] rounded-full h-1.5 overflow-hidden border border-white/[.02]">
          <div 
            className="bg-emerald-500 h-1.5 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
            style={{ width: `${data.total > 0 ? (data.resolved / data.total) * 100 : 0}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}
