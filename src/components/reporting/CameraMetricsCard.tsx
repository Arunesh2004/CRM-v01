export function CameraMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="glass-panel p-6 border-l-4 border-l-emerald-500">
      <h2 className="text-xl font-display font-bold text-white mb-4">Camera Health</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0D1326]/40 p-4 rounded-xl text-center border border-white/[.04]">
          <p className="text-[#8891B0] text-[10px] uppercase tracking-wider font-semibold">Total Provisioned</p>
          <p className="text-3xl font-display font-bold text-white mt-1">{data.total}</p>
        </div>
        <div className="bg-emerald-500/10 p-4 rounded-xl text-center border border-emerald-500/20">
          <p className="text-emerald-400 text-[10px] uppercase tracking-wider font-semibold">Active Streams</p>
          <p className="text-3xl font-display font-bold text-emerald-500 mt-1">{data.active}</p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold mb-2">
          <span className="text-[#8891B0]">Online Rate</span>
          <span className="text-emerald-400">{data.total > 0 ? ((data.active / data.total) * 100).toFixed(1) : 0}%</span>
        </div>
        <div className="w-full bg-rose-500/20 rounded-full h-1.5 flex overflow-hidden border border-white/[.02]">
          <div 
            className="bg-emerald-500 h-1.5 shadow-[0_0_10px_rgba(16,185,129,0.8)]" 
            style={{ width: `${data.total > 0 ? (data.active / data.total) * 100 : 0}%` }}
          ></div>
        </div>
        <p className="text-[10px] font-semibold text-rose-400 mt-2 text-right uppercase tracking-wider">{data.offline} offline</p>
      </div>
    </div>
  );
}
