export function CommunicationMetricsCard({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="glass-panel p-6 border-l-4 border-l-blue-500">
      <h2 className="text-xl font-display font-bold text-white mb-4">Communication Overview</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-[#0D1326]/40 p-4 rounded-xl text-center border border-white/[.04]">
          <p className="text-[#8891B0] text-[10px] uppercase tracking-wider font-semibold">Total Dispatched</p>
          <p className="text-3xl font-display font-bold text-white mt-1">{data.total}</p>
        </div>
        <div className="bg-blue-500/10 p-4 rounded-xl text-center border border-blue-500/20">
          <p className="text-blue-400 text-[10px] uppercase tracking-wider font-semibold">Success Rate</p>
          <p className="text-3xl font-display font-bold text-blue-500 mt-1">{data.successRate}%</p>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-semibold text-[#8891B0] uppercase tracking-wider mb-3">Channel Breakdown</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs mb-1 text-white">
              <span className="text-[#8891B0]">Email</span>
              <span className="font-semibold">{data.email}</span>
            </div>
            <div className="w-full bg-white/[.04] rounded-full h-1.5 overflow-hidden border border-white/[.02]">
              <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.email/data.total)*100 : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1 text-white">
              <span className="text-[#8891B0]">SMS</span>
              <span className="font-semibold">{data.sms}</span>
            </div>
            <div className="w-full bg-white/[.04] rounded-full h-1.5 overflow-hidden border border-white/[.02]">
              <div className="bg-orange-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.sms/data.total)*100 : 0}%` }}></div>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1 text-white">
              <span className="text-[#8891B0]">WhatsApp</span>
              <span className="font-semibold">{data.whatsapp}</span>
            </div>
            <div className="w-full bg-white/[.04] rounded-full h-1.5 overflow-hidden border border-white/[.02]">
              <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${data.total > 0 ? (data.whatsapp/data.total)*100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
