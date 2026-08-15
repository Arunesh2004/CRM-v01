import { notFound } from 'next/navigation';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto py-8">
      
      {/* Page Header */}
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/leads" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Leads
        </Link>
      </div>

      <div className="glass-panel p-6 sm:p-8 flex flex-col sm:flex-row justify-between sm:items-end gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex items-center gap-5">
          <div className="w-16 h-16 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold text-white tracking-tight max-w-2xl truncate">{lead.company}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="font-medium text-[#8891B0]">{lead.name}</span>
              <StatusUpdater leadId={lead.id} currentStatus={lead.status} />
            </div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Lead Details</h3>
            <div className="space-y-4">
              {lead.email && (
                <div className="flex items-center text-[#8891B0]">
                  <Mail className="w-4 h-4 mr-3 text-violet-400" />
                  <span>{lead.email}</span>
                </div>
              )}
              {lead.phone && (
                <div className="flex items-center text-[#8891B0]">
                  <Phone className="w-4 h-4 mr-3 text-violet-400" />
                  <span>{lead.phone}</span>
                </div>
              )}
              <div className="flex items-center text-[#8891B0]">
                <User2 className="w-4 h-4 mr-3 text-violet-400" />
                <span>{lead.assignedUser?.email || 'Unassigned'}</span>
              </div>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Tasks</h3>
            {lead.tasks.length === 0 ? (
              <div className="text-sm text-[#8891B0] text-center py-4 bg-white/[.02] rounded-xl border border-white/[.04]">No tasks found.</div>
            ) : (
              <div className="space-y-2">
                {lead.tasks.map(task => (
                  <div key={task.id} className="flex justify-between p-3 border border-white/[.04] rounded-lg bg-[#0D1326]/50">
                    <span className="text-sm text-[#E7EAF5]">{task.title}</span>
                    <Badge variant="slate">{task.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="glass-panel h-full flex flex-col overflow-hidden">
            <div className="p-4 border-b border-white/[.04] bg-[#0D1326]/30">
              <h3 className="text-sm uppercase tracking-wider text-[#8891B0] font-semibold flex items-center">
                <Clock className="w-4 h-4 mr-2" />
                Activity Timeline
              </h3>
            </div>
            <div className="p-4 flex-1">
              <CustomerActivityTimeline activities={activities.map(a => ({
                id: a.id,
                type: a.type === 'NOTE' ? 'NOTE' : 'SYSTEM',
                title: a.type === 'NOTE' ? 'Note Added' : 'System Event',
                description: a.content,
                actor: { name: a.actor?.email || 'System' },
                timestamp: new Date(a.createdAt).toISOString()
              }))} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
