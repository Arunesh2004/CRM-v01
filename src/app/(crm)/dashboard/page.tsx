import { Suspense } from 'react';
import { requireAuth, requireTenant } from '@/lib/auth';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { getDashboardAnalytics } from '@/modules/analytics/analytics.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Users, Target, CheckSquare, Phone, MessageSquare, AlertTriangle, Activity, User, Mail, Link as LinkIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const SalesChart = dynamic(() => import('@/components/ui/SalesChart').then(mod => mod.SalesChart), {
  loading: () => <Skeleton className="h-[350px] w-full rounded-xl" />
});

export default async function DashboardPage() {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  // Preserve identical backend logic
  const customerCount = await prisma.customer.count({ where: { tenantId, deletedAt: null } });
  const activeLeadsCount = await prisma.lead.count({ where: { tenantId, status: { notIn: ['LOST', 'CONVERTED'] } } });
  const pendingTasksCount = await prisma.task.count({ where: { tenantId, status: 'PENDING' } });
  
  const callCount = await prisma.call.count({ where: { tenantId } });
  const messageCount = await prisma.message.count({ where: { tenantId } });
  const emailCount = await prisma.emailMessage.count({ where: { tenantId } });
  const incidentCount = await prisma.incident.count({ where: { tenantId } });
  
  const recentActivities = await prisma.activityTimeline.findMany({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { actor: true }
  });

  const analyticsData = await getDashboardAnalytics(tenantId, 6);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Command Center</h1>
          <p className="text-muted-foreground mt-1">Global operations overview for India Region.</p>
        </div>
      </div>

      {/* Primary CRM Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link href="/customers" className="block">
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-blue-500 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{customerCount.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/leads" className="block">
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-purple-500 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Leads</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeLeadsCount.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        </Link>
        
        <Link href="/tasks" className="block">
          <Card className="hover:shadow-md transition-shadow border-t-4 border-t-green-500 cursor-pointer h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{pendingTasksCount.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Communication & Security Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-orange-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Calls</CardTitle>
            <Phone className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{callCount.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Emails</CardTitle>
            <Mail className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{emailCount.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-teal-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-teal-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{messageCount.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-red-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Security Incidents</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{incidentCount.toLocaleString('en-IN')}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Regional Sales Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <SalesChart data={analyticsData} />
          </CardContent>
        </Card>
        
        <Card className="lg:col-span-3 flex flex-col">
          <CardHeader>
            <CardTitle>Activity Timeline</CardTitle>
          </CardHeader>
          <CardContent className="flex-1">
            <Suspense fallback={
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            }>
              {recentActivities.length === 0 ? (
                <EmptyState 
                  title="No Recent Activity" 
                  description="Your team's operations will appear here once workflows begin." 
                  icon={<Activity className="w-8 h-8 opacity-50" />}
                  className="mt-4 border-dashed"
                />
              ) : (
                <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {recentActivities.map(activity => (
                    <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card p-4 rounded border shadow-sm">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-slate-900">{activity.actor?.email || 'System'}</div>
                          <time className="text-xs font-medium text-indigo-500">{new Date(activity.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute:'2-digit' })}</time>
                        </div>
                        <div className="text-slate-500 text-sm">{activity.content}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Suspense>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
