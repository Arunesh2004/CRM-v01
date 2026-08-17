import { Suspense } from 'react';
import { getIncidentsAction } from '@/modules/incident/actions/incident.actions';
import Link from 'next/link';
import { ShieldAlert, AlertTriangle, AlertOctagon, Info } from 'lucide-react';

export default async function IncidentsDashboard() {
  const result = await getIncidentsAction();
  const incidents = result.success ? (result.data || []) : [];

  const getSeverityIcon = (severity: string) => {
    switch(severity) {
      case 'CRITICAL': return <AlertOctagon className="w-5 h-5 text-rose-500" />;
      case 'HIGH': return <AlertTriangle className="w-5 h-5 text-orange-500" />;
      case 'MEDIUM': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'OPEN': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'ACKNOWLEDGED': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'INVESTIGATING': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'RESOLVED': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'CLOSED': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
      default: return 'bg-white/10 text-white border-white/20';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            Incident Management
          </h1>
          <p className="text-[#8891B0] mt-2">Track, investigate, and resolve security incidents.</p>
        </div>
      </div>

      <div className="glass-panel rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[.08] bg-white/[.02]">
                <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Incident</th>
                <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Severity</th>
                <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Location / Camera</th>
                <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Assignee</th>
                <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {incidents.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#8891B0]">
                    <div className="flex flex-col items-center justify-center">
                      <ShieldAlert className="w-12 h-12 mb-4 opacity-20" />
                      <p>No active incidents.</p>
                    </div>
                  </td>
                </tr>
              )}
              {incidents.map((incident: any) => (
                <tr key={incident.id} className="hover:bg-white/[.02] transition-colors group cursor-pointer">
                  <td className="p-4 font-medium text-white group-hover:text-violet-400 transition-colors">
                    <Link href={`/incidents/${incident.id}`} className="block">
                      {incident.title}
                    </Link>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {getSeverityIcon(incident.severity)}
                      <span className="text-sm text-white">{incident.severity}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(incident.status)}`}>
                      {incident.status}
                    </span>
                  </td>
                  <td className="p-4 text-[#8891B0] text-sm">
                    {incident.location?.name} <br/>
                    <span className="text-xs opacity-70">{incident.camera?.name}</span>
                  </td>
                  <td className="p-4 text-[#8891B0] text-sm">
                    {incident.assignedUser?.email || 'Unassigned'}
                  </td>
                  <td className="p-4 text-[#8891B0] text-sm">
                    {new Date(incident.createdAt).toLocaleDateString()} {new Date(incident.createdAt).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
