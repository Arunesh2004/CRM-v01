import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@db/utils/prisma-tenant';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldAlert, User, Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default async function AuditLogsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
  await requireAuth();
  const tenantId = await requireTenant();
  // Ensure only admins can view audit logs
  await requirePermission('SYSTEM', 'UPDATE');

  const prisma = withTenant(tenantId);
  const actionFilter = typeof searchParams.action === 'string' ? searchParams.action : undefined;
  
  const where: any = { tenantId };
  if (actionFilter) {
    where.action = actionFilter;
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: 100
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Security Audit Log</h1>
            <p className="text-sm text-[#8891B0] mt-1">Immutable trail of all organizational activities.</p>
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-violet-500/10 items-center justify-center border border-violet-500/20">
            <ShieldAlert className="w-6 h-6 text-violet-400" />
          </div>
        </div>
      </div>
      
      {/* Table Panel */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[.08] text-xs font-medium text-[#8891B0] uppercase tracking-wider" style={{ background: 'rgba(20,27,51,.3)' }}>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource</th>
                <th className="px-6 py-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[#8891B0]">
                    <div className="flex flex-col items-center justify-center">
                      <Activity className="w-10 h-10 mb-3 opacity-20" />
                      <p>No audit events found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[.02] transition-colors text-sm">
                    <td className="px-6 py-4 whitespace-nowrap text-[#8891B0]">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2.5 opacity-50" />
                        {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center font-medium text-white">
                        <User className="w-4 h-4 mr-2.5 text-[#8891B0]" />
                        {log.actorType === 'SYSTEM' ? 'System' : log.actorId}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="font-mono text-[10px] uppercase border-white/10 text-[#8891B0]">
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-[#8891B0]">
                      {log.resource} <span className="text-[10px] opacity-50 ml-1">({log.resourceId})</span>
                    </td>
                    <td className="px-6 py-4 font-mono text-[11px] text-[#8891B0] max-w-xs truncate" title={log.metadata ? JSON.stringify(log.metadata) : '-'}>
                      {log.metadata ? JSON.stringify(log.metadata) : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
