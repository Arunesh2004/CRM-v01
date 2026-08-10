import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ShieldAlert, User, Activity, Clock } from 'lucide-react';
import { format } from 'date-fns';

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Security Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Immutable trail of all organizational activities.</p>
      </div>
      
      <Card>
        <CardHeader className="border-b bg-muted/20">
          <CardTitle className="flex items-center text-lg">
            <ShieldAlert className="w-5 h-5 mr-2 text-primary" />
            System Events
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/30 border-b">
                <tr>
                  <th className="px-6 py-3 font-semibold">Timestamp</th>
                  <th className="px-6 py-3 font-semibold">Actor</th>
                  <th className="px-6 py-3 font-semibold">Action</th>
                  <th className="px-6 py-3 font-semibold">Resource</th>
                  <th className="px-6 py-3 font-semibold">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <Activity className="w-10 h-10 mb-2 opacity-20" />
                        <p>No audit events found.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-muted/10 transition-colors">
                      <td className="px-6 py-3 whitespace-nowrap text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="w-3.5 h-3.5 mr-2 opacity-50" />
                          {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                        </div>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        <div className="flex items-center font-medium">
                          <User className="w-3.5 h-3.5 mr-2 opacity-50" />
                          {log.actorType === 'SYSTEM' ? 'System' : log.actorId}
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Badge variant="outline" className="font-mono text-[10px] uppercase bg-background">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-muted-foreground">
                        {log.resource} <span className="text-[10px] opacity-50">({log.resourceId})</span>
                      </td>
                      <td className="px-6 py-3 font-mono text-[10px] text-muted-foreground">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
