import { Suspense } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Plus, Clock, Calendar as CalendarIcon, CheckCircle2, AlertCircle, CheckSquare } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { getTasksAction } from '@/modules/crm/actions/task.actions';
import { FilterBar } from '@/components/crm/FilterBar';
import { PaginationButton } from '@/components/crm/PaginationButton';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireTenant } from '@/lib/auth';
import { format } from 'date-fns';
import Link from 'next/link';
import { TaskCalendarView } from '@/components/crm/TaskCalendarView';

export default async function TasksPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const priority = typeof searchParams.priority === 'string' ? searchParams.priority : undefined;
  const assignedUserId = typeof searchParams.owner === 'string' ? searchParams.owner : undefined;
  const cursor = typeof searchParams.cursor === 'string' ? searchParams.cursor : undefined;
  const viewMode = typeof searchParams.view === 'string' && searchParams.view === 'calendar' ? 'calendar' : 'list';

  // Request all tasks for calendar if calendar mode, else paginated list. 
  // For production scale, Calendar might need its own date-range endpoint, 
  // but for R.14.2 we can fetch a larger page or assume the query handles it.
  const limit = viewMode === 'calendar' ? 500 : 50;

  const result = await getTasksAction({
    search,
    cursor,
    limit,
    priority,
    filters: {
      ...(status ? { status } : {}),
      ...(assignedUserId ? { assignedUserId } : {}),
    }
  });

  const resData = result.success ? (result.data as any) : { data: [], pagination: { hasMore: false, nextCursor: null } };
  const tasks = Array.isArray(resData) ? resData : (resData.data || []);
  const pagination = !Array.isArray(resData) ? resData.pagination : null;

  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  const users = await prisma.user.findMany({ 
    where: { 
      tenantId,
      clerkId: { not: { startsWith: 'SYSTEM_' } }
    }, 
    select: { id: true, email: true } 
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDueDateBadge = (task: any) => {
    if (task.status === 'COMPLETED') {
      return <Badge className="bg-green-100 text-green-800 flex gap-1 border-green-200"><CheckCircle2 className="w-3 h-3"/> COMPLETED</Badge>;
    }
    if (!task.dueDate) return <Badge variant="outline" className="text-muted-foreground">NO DATE</Badge>;
    
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(due);
    dueDate.setHours(0,0,0,0);

    if (dueDate < today) {
      return <Badge variant="destructive" className="animate-pulse flex gap-1"><AlertCircle className="w-3 h-3"/> OVERDUE</Badge>;
    } else if (dueDate.getTime() === today.getTime()) {
      return <Badge className="bg-yellow-100 text-yellow-800 flex gap-1 border-yellow-200"><Clock className="w-3 h-3"/> DUE TODAY</Badge>;
    } else {
      return <Badge variant="secondary" className="flex gap-1 border-muted"><CalendarIcon className="w-3 h-3"/> UPCOMING</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
            <CheckSquare className="w-6 h-6" /> Task Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Manage operations and daily follow-ups.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center bg-card rounded-md border p-1 shadow-sm">
            <Link 
              href="?view=list" 
              className={`px-3 py-1.5 text-xs font-medium rounded ${viewMode === 'list' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              List
            </Link>
            <Link 
              href="?view=calendar" 
              className={`px-3 py-1.5 text-xs font-medium rounded ${viewMode === 'calendar' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted'}`}
            >
              Calendar
            </Link>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>
      
      <div className="bg-card p-4 rounded-xl border shadow-sm">
        <FilterBar 
          filters={[
            {
              key: 'status',
              label: 'All Statuses',
              options: [
                { label: 'Pending', value: 'PENDING' },
                { label: 'In Progress', value: 'IN_PROGRESS' },
                { label: 'Completed', value: 'COMPLETED' }
              ]
            },
            {
              key: 'priority',
              label: 'All Priorities',
              options: [
                { label: 'Urgent', value: 'URGENT' },
                { label: 'High', value: 'HIGH' },
                { label: 'Medium', value: 'MEDIUM' },
                { label: 'Low', value: 'LOW' }
              ]
            },
            {
              key: 'owner',
              label: 'All Owners',
              options: users.map((u: any) => ({ label: u.email, value: u.id }))
            }
          ]}
        />
      </div>

      <Suspense fallback={<div className="space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>}>
        {viewMode === 'calendar' ? (
          <TaskCalendarView tasks={tasks} />
        ) : (
          <div className="space-y-4">
            {tasks.length === 0 ? (
              <EmptyState 
                icon={<CheckSquare className="w-12 h-12" />}
                title="No tasks found"
                description="Try adjusting your filters or create a new task."
              />
            ) : (
              <div className="grid gap-3">
                {tasks.map((task: any) => (
                  <Link href={`/tasks/${task.id}`} key={task.id} className="block group">
                    <div className="bg-card p-4 rounded-xl border shadow-sm group-hover:shadow-md group-hover:border-primary/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1 overflow-hidden">
                        <div className="shrink-0 mt-1">
                          <div className={`w-3 h-3 rounded-full ${task.status === 'COMPLETED' ? 'bg-green-500' : 'bg-primary ring-4 ring-primary/20'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`font-semibold text-foreground truncate ${task.status === 'COMPLETED' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                            <Badge className={`${getPriorityColor(task.priority)} border text-[10px] uppercase font-bold px-2 py-0.5`}>
                              {task.priority}
                            </Badge>
                            {task.assignedUser ? (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="w-4 h-4 rounded-full bg-muted flex items-center justify-center font-medium text-[8px] uppercase">
                                  {task.assignedUser.email.charAt(0)}
                                </span>
                                {task.assignedUser.email}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground italic">Unassigned</span>
                            )}
                            {(task.customer || task.lead) && (
                              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                                • {task.customer?.name || task.lead?.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center justify-end md:w-[200px]">
                        {getDueDateBadge(task)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
            
            {pagination?.hasMore && pagination.nextCursor && (
              <div className="flex justify-center pt-4">
                <PaginationButton nextCursor={pagination.nextCursor} hasMore={pagination.hasMore} />
              </div>
            )}
          </div>
        )}
      </Suspense>
    </div>
  );
}
