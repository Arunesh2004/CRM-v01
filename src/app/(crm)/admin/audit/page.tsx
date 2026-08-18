import { getAuditLogsAction } from '@/modules/admin/actions/audit.actions';
import { Card } from '@/components/ui/Card';
import { Activity } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function AdminAuditPage() {
  const result = await getAuditLogsAction();
  const logs = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" /> Security & Audit Logs
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Track system events, data access, and administrative actions.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Timestamp</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Actor</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Action</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {logs?.map((log: any) => (
                <tr key={log.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4 text-[#8891B0]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-white">
                    {log.actorType === 'SYSTEM' ? 'SYSTEM' : log.actorUser?.email || log.actorId}
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="slate">{log.action}</Badge>
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">
                    {log.resource} {log.resourceId ? `(${log.resourceId.split('-')[0]})` : ''}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#8891B0]">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
