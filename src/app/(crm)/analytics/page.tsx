import { getDashboardMetricsAction } from '@/modules/reporting/actions/reporting.actions';
import { BarChart3, Activity, Users, Phone, ShieldAlert } from 'lucide-react';
import { Card, KpiCard } from '@/components/ui/Card';

function AnalyticsKpiCard({ title, value, trend, icon: Icon }: { title: string, value: string | number, trend?: string, icon: any }) {
  return (
    <KpiCard>
      <div className="flex justify-between items-start mb-4">
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-violet-400" />
        </div>
        {trend && (
          <div className="text-xs font-bold px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            {trend}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-3xl font-display font-bold text-white tracking-tight">{value}</h3>
        <p className="text-sm font-medium text-[#8891B0] mt-1">{title}</p>
      </div>
    </KpiCard>
  );
}

export default async function AnalyticsDashboardPage() {
  const metricsResult = await getDashboardMetricsAction();
  const data = metricsResult.success ? metricsResult.data : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Executive Analytics</h1>
            <p className="text-sm text-[#8891B0] mt-1">Key performance indicators across all departments.</p>
          </div>
          <div className="flex space-x-2">
            <select 
              className="text-xs transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent appearance-none cursor-pointer"
              style={{
                background: 'rgba(20,27,51,.55) url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238891B0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right .8rem top 50%',
                backgroundSize: '.65rem auto',
                border: '1px solid rgba(255,255,255,.08)',
                borderRadius: '.7rem',
                padding: '.6rem 2.2rem .6rem 1rem',
                color: '#E7EAF5',
                outline: 'none',
              }}
            >
              <option style={{ background: '#0D1326', color: '#E7EAF5' }}>Last 30 Days</option>
              <option style={{ background: '#0D1326', color: '#E7EAF5' }}>Last 90 Days</option>
              <option style={{ background: '#0D1326', color: '#E7EAF5' }}>Year to Date</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* CRM Performance Section */}
      <section>
        <div className="flex items-center gap-3 mb-4 pl-1">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <Users className="w-4 h-4 text-violet-400" />
          </div>
          <h2 className="text-lg font-display font-semibold text-white">CRM Performance</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <AnalyticsKpiCard title="New Leads" value={data?.crm?.leads ?? 0} trend="+12%" icon={Activity} />
          <AnalyticsKpiCard title="Conversion Rate" value={`${data?.crm?.conversionRate ?? 0}%`} trend="+2.4%" icon={BarChart3} />
          <AnalyticsKpiCard title="Customers" value={data?.crm?.customers ?? 0} icon={Users} />
          <AnalyticsKpiCard title="Tasks Completed" value={data?.crm?.tasks ?? 0} icon={Activity} />
        </div>
      </section>

      {/* Communication Metrics Section */}
      <section className="pt-4">
        <div className="flex items-center gap-3 mb-4 pl-1">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Phone className="w-4 h-4 text-cyan-400" />
          </div>
          <h2 className="text-lg font-display font-semibold text-white">Communication Metrics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-panel p-6">
            <h3 className="font-display font-semibold text-[#8891B0] mb-4 text-sm">Email Delivery</h3>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-display font-bold text-white">{data?.communication?.email ?? 0}</span>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">Sent</span>
            </div>
          </div>
          <div className="glass-panel p-6">
            <h3 className="font-display font-semibold text-[#8891B0] mb-4 text-sm">Telephony (Calls)</h3>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-display font-bold text-white">{data?.communication?.calls ?? 0}</span>
              <span className="text-xs text-violet-400 font-medium bg-violet-400/10 px-2 py-0.5 rounded-full">Total Calls</span>
            </div>
          </div>
          <div className="glass-panel p-6">
            <h3 className="font-display font-semibold text-[#8891B0] mb-4 text-sm">WhatsApp Business</h3>
            <div className="flex items-baseline justify-between">
              <span className="text-3xl font-display font-bold text-white">{data?.communication?.whatsapp ?? 0}</span>
              <span className="text-xs text-emerald-400 font-medium bg-emerald-400/10 px-2 py-0.5 rounded-full">Sent</span>
            </div>
          </div>
        </div>
      </section>

      {/* Billing & System Usage Section */}
      <section className="pt-4">
        <div className="flex items-center gap-3 mb-4 pl-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
          </div>
          <h2 className="text-lg font-display font-semibold text-white">System & Operations</h2>
        </div>
        <div className="grid grid-cols-1 gap-6">
          <div className="glass-panel p-6">
            <h3 className="font-display font-semibold text-white mb-5 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Security & Incidents
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/[.04]">
                <span className="text-sm text-[#8891B0]">Total Incidents</span>
                <span className="text-sm font-medium text-white">{data?.security?.total ?? 0}</span>
              </div>
              <div className="flex justify-between items-center pb-3 border-b border-white/[.04]">
                <span className="text-sm text-[#8891B0]">Critical Alerts</span>
                <span className="text-sm font-medium text-rose-400">{data?.security?.critical ?? 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-[#8891B0]">Active Cameras</span>
                <span className="text-sm font-medium text-white">{data?.camera?.active ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
