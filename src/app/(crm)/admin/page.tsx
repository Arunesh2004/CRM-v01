import { requireAuth, requireTenant } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { AdminClientTabs } from '@/components/admin/AdminClientTabs';

export default async function AdminDashboardPage() {
  await requireAuth();
  const tenantId = await requireTenant();
  
  // Fetch everything securely isolated by tenantId
  const [tenant, users, roles, subscriptions] = await Promise.all([
    prisma.tenant.findUnique({
      where: { id: tenantId }
    }),
    prisma.user.findMany({
      where: { tenantId },
      select: { id: true, email: true, createdAt: true, status: true }
    }),
    prisma.role.findMany({
      where: { tenantId },
      select: { id: true, name: true }
    }).catch(() => []), // Graceful fallback if roles table isn't active
    prisma.subscription.findMany({
      where: { tenantId, status: 'ACTIVE' },
      include: { plan: true }
    }).catch(() => []) // Graceful fallback if billing module isn't active
  ]);

  if (!tenant) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center text-[#8891B0]">
          <h2 className="text-2xl font-display font-bold text-white mb-2">Tenant Not Found</h2>
          <p>Could not locate workspace context.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="border-b border-white/[.08] pb-6">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight">Enterprise Settings</h1>
        <p className="text-[#8891B0] mt-2">Manage organization profile, access controls, and infrastructure.</p>
      </div>
      
      <AdminClientTabs 
        tenant={tenant} 
        users={users} 
        roles={roles} 
        subscriptions={subscriptions} 
      />
    </div>
  );
}
