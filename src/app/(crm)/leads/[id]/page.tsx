import { notFound } from 'next/navigation';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Mail, Phone, Target, User2, ArrowLeft, Clock } from 'lucide-react';
import Link from 'next/link';
import { CustomerActivityTimeline } from '@/components/crm/CustomerActivityTimeline';
import { StatusUpdater } from '@/components/crm/StatusUpdater';

export default async function LeadDetailsPage({ params }: { params: { id: string } }) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('LEAD', 'READ');

  const prisma = withTenant(tenantId);
  const [lead, activities] = await Promise.all([
    prisma.lead.findFirst({
      where: { id: params.id, tenantId, deletedAt: null },
      include: {
        assignedUser: { select: { email: true } },
        tasks: { orderBy: { createdAt: 'desc' }, where: { deletedAt: null }, take: 20 },
      }
    }),
    prisma.activityTimeline.findMany({
      where: { tenantId, entityType: 'LEAD', entityId: params.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { actor: { select: { email: true } } }
    })
  ]);

  if (!lead) return notFound();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* Page Header */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Link href="/leads" className="hover:text-primary transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Leads
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white shadow-md shrink-0">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight max-w-2xl truncate">{lead.company}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-medium text-foreground">{lead.name}</span>
              <StatusUpdater leadId={lead.id} currentStatus={lead.status} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lead Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lead.email && (
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{lead.email}</span>
                  </div>
                )}
                {lead.phone && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{lead.phone}</span>
                  </div>
                )}
                <div className="flex items-center">
                  <User2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span>{lead.assignedUser?.email || 'Unassigned'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              {lead.tasks.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-4">No tasks found.</div>
              ) : (
                <div className="space-y-2">
                  {lead.tasks.map(task => (
                    <div key={task.id} className="flex justify-between p-2 border rounded">
                      <span className="text-sm">{task.title}</span>
                      <Badge variant="outline">{task.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="h-full">
            <CardHeader className="border-b bg-muted/30 pb-4">
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CustomerActivityTimeline activities={activities.map(a => ({
                id: a.id,
                type: a.type === 'NOTE' ? 'NOTE' : 'SYSTEM',
                title: a.type === 'NOTE' ? 'Note Added' : 'System Event',
                description: a.content,
                actor: { name: a.actor?.email || 'System' },
                timestamp: new Date(a.createdAt).toISOString()
              }))} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
