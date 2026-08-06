import { Suspense } from 'react';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';

export default async function DashboardPage() {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  // Fetch real tenant-scoped data
  const customerCount = await prisma.customer.count({ where: { tenantId } });
  const activeLeadsCount = await prisma.lead.count({ where: { tenantId, status: { notIn: ['LOST', 'CONVERTED'] } } });
  const pendingTasksCount = await prisma.task.count({ where: { tenantId, status: 'PENDING' } });
  
  // Fetch recent activities
  const recentActivities = await prisma.activityTimeline.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { actor: true }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Real KPI Cards */}
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm font-semibold">Customers</div>
          <div className="text-3xl font-bold">{customerCount}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm font-semibold">Active Leads</div>
          <div className="text-3xl font-bold">{activeLeadsCount}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm font-semibold">Pending Tasks</div>
          <div className="text-3xl font-bold">{pendingTasksCount}</div>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-500 text-sm font-semibold">Monthly Revenue</div>
          <div className="text-3xl font-bold">$0</div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div>Loading activities...</div>}>
          <div className="bg-white p-4 rounded shadow h-64 overflow-y-auto">
            <h2 className="font-semibold mb-2">Recent Activities</h2>
            {recentActivities.length === 0 ? (
              <div className="text-gray-500 text-sm">No recent activity.</div>
            ) : (
              <ul className="space-y-3">
                {recentActivities.map(activity => (
                  <li key={activity.id} className="text-sm">
                    <span className="font-medium text-gray-800">{activity.content}</span>
                    <div className="text-xs text-gray-400">
                      {new Date(activity.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Suspense>
        <Suspense fallback={<div>Loading tasks...</div>}>
          <div className="bg-white p-4 rounded shadow h-64">
             <h2 className="font-semibold mb-2">Task Summary</h2>
             <div className="text-gray-500 text-sm">No tasks assigned for today.</div>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
