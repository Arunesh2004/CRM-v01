export function CrmMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="glass-panel p-6 border-l-4 border-l-cyan-500">
      <h2 className="text-xl font-display font-bold text-white mb-4">CRM Overview</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-violet-500/10 p-4 rounded-xl text-center border border-violet-500/20">
          <p className="text-violet-400 text-[10px] uppercase tracking-wider font-semibold">Leads</p>
          <p className="text-3xl font-display font-bold text-violet-500 mt-1">{data.leads}</p>
        </div>
        <div className="bg-cyan-500/10 p-4 rounded-xl text-center border border-cyan-500/20">
          <p className="text-cyan-400 text-[10px] uppercase tracking-wider font-semibold">Customers</p>
          <p className="text-3xl font-display font-bold text-cyan-500 mt-1">{data.customers}</p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-white/5 border border-white/[.04] rounded-xl flex items-center justify-between">
        <span className="text-[11px] uppercase tracking-wider font-semibold text-[#8891B0]">Conversion Rate</span>
        <span className="text-2xl font-display font-bold text-white">{data.conversionRate}%</span>
      </div>
    </div>
  );
}
