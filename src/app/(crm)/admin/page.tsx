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
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800">Tenant Not Found</h2>
          <p className="text-gray-500 mt-2">Could not locate workspace context.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary">Enterprise Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage organization profile, access controls, and infrastructure.</p>
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
