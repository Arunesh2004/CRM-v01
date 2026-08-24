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
import { withTenant } from '@db/utils/prisma-tenant';
import { requireTenant } from '@/lib/auth';
import { format } from 'date-fns';
import Link from 'next/link';
import { TaskCalendarView } from '@/components/crm/TaskCalendarView';
import { TaskForm } from '@/components/crm/TaskForm';

export default async function TasksPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const searchParams = await props.searchParams;
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

  const getPriorityBadge = (p: string) => {
    const map: Record<string, string> = {
      URGENT: 'badge-rose',
      HIGH:   'badge-rose',
      MEDIUM: 'badge-amber',
      LOW:    'badge-slate',
    };
    return map[p] ?? 'badge-slate';
  };

  const getDueDateBadge = (task: any) => {
    if (task.status === 'COMPLETED') {
      return <Badge variant="emerald"><CheckCircle2 className="w-3 h-3"/>Done</Badge>;
    }
    if (!task.dueDate) return <Badge variant="slate">No date</Badge>;
    const due = new Date(task.dueDate);
    const today = new Date();
    today.setHours(0,0,0,0);
    const dueDate = new Date(due);
    dueDate.setHours(0,0,0,0);
    if (dueDate < today) {
      return <Badge variant="rose"><AlertCircle className="w-3 h-3"/>Overdue</Badge>;
    } else if (dueDate.getTime() === today.getTime()) {
      return <Badge variant="amber"><Clock className="w-3 h-3"/>Due today</Badge>;
    } else {
      return <Badge variant="slate"><CalendarIcon className="w-3 h-3"/>Upcoming</Badge>;
    }
  };

  return (
    <div className="space-y-6 animate-in pb-10">
      {/* Page header */}
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5" style={{ color: '#7C5CFC' }} /> Task Workspace
          </p>
          <p className="text-sm mt-1" style={{ color: '#8891B0' }}>Manage operations and daily follow-ups.</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* View toggle */}
          <div className="flex p-1 rounded-[.7rem] gap-0.5" style={{ background: 'rgba(20,27,51,.6)', border: '1px solid rgba(255,255,255,.08)' }}>
            <Link
              href="?view=list"
              className={`px-3.5 py-1.5 rounded-[.55rem] text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-gradient-to-br from-[#7C5CFC] to-[#9B7BFF] text-white'
                  : 'text-[#8891B0] hover:text-white hover:bg-white/5'
              }`}
            >
              List
            </Link>
            <Link
              href="?view=calendar"
              className={`px-3.5 py-1.5 rounded-[.55rem] text-xs font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-gradient-to-br from-[#7C5CFC] to-[#9B7BFF] text-white'
                  : 'text-[#8891B0] hover:text-white hover:bg-white/5'
              }`}
            >
              Calendar
            </Link>
          </div>
          <TaskForm users={users} />
        </div>
      </div>
      
      <div className="glass-panel p-4 rounded-xl">
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
                    <div
                      className="glass rounded-[.9rem] p-4 card-hover flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4 flex-1 overflow-hidden">
                        {/* Status dot */}
                        <div className="shrink-0 mt-1">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              task.status === 'COMPLETED'
                                ? 'bg-emerald-400'
                                : 'bg-violet-400 ring-4 ring-violet-500/20'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-white truncate ${
                              task.status === 'COMPLETED'
                                ? 'line-through text-slate-500'
                                : ''
                            }`}
                          >
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <Badge variant={getPriorityBadge(task.priority) as any}>
                              {task.priority}
                            </Badge>
                            {task.assignedUser ? (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <span
                                  className="w-4 h-4 rounded-full flex items-center justify-center font-bold text-[8px] text-white"
                                  style={{ background: 'rgba(124,92,252,.2)' }}
                                >
                                  {task.assignedUser.email.charAt(0).toUpperCase()}
                                </span>
                                {task.assignedUser.email.split('@')[0]}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-500 italic">Unassigned</span>
                            )}
                            {(task.customer || task.lead) && (
                              <span className="text-xs text-slate-400 truncate max-w-[200px]">
                                · {task.customer?.name || task.lead?.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 flex items-center justify-end md:w-[180px]">
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
