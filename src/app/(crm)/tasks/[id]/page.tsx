import { notFound } from 'next/navigation';
import { getTaskByIdAction } from '@/modules/crm/actions/task.actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { CustomerActivityTimeline } from '@/components/crm/CustomerActivityTimeline';
import { UnifiedTimelineItem } from '@/modules/crm/crm.types';
import { AlertCircle, Calendar, CheckSquare, Clock, User, Building, PhoneCall } from 'lucide-react';
import Link from 'next/link';
import { TaskComments } from '@/components/crm/TaskComments';

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const result = await getTaskByIdAction(params.id);
  
  if (!result.success || !result.data) {
    notFound();
  }

  const task = result.data;

  // Map activities and comments to UnifiedTimelineItem
  const timelineEvents: UnifiedTimelineItem[] = [
    ...(task.activities || []).map((a: any) => ({
      id: a.id,
      type: (a.type === 'NOTE' ? 'NOTE' : 'SYSTEM') as 'NOTE' | 'SYSTEM' | 'TASK' | 'EMAIL' | 'CALL' | 'MESSAGE',
      title: a.type === 'NOTE' ? 'Note Added' : 'System Event',
      description: a.content,
      actor: { name: a.actor?.email || 'System' },
      timestamp: new Date(a.createdAt).toISOString()
    })),
    ...(task.comments || []).map((c: any) => ({
      id: c.id,
      type: 'NOTE' as 'NOTE' | 'SYSTEM' | 'TASK' | 'EMAIL' | 'CALL' | 'MESSAGE',
      title: 'Comment Added',
      description: c.content,
      actor: { name: c.user?.email || 'Unknown' },
      timestamp: new Date(c.createdAt).toISOString()
    }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-800 border-red-200';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOW': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-primary" />
              {task.title}
            </h1>
            {isOverdue && (
              <Badge variant="destructive" className="animate-pulse flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> OVERDUE
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-4 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" /> 
              Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4" /> 
              Due: {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy h:mm a') : 'No due date'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge className={`${getStatusColor(task.status)} border px-3 py-1 text-xs uppercase font-semibold`}>
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge className={`${getPriorityColor(task.priority)} border px-3 py-1 text-xs uppercase font-semibold`}>
            {task.priority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Task Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap min-h-[100px]">
                {task.description || <span className="text-muted-foreground italic">No description provided.</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Discussion</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskComments taskId={task.id} initialComments={task.comments} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-md flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/20">
                {task.assignedUser ? (
                  <>
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center uppercase font-bold">
                      {task.assignedUser.email.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{task.assignedUser.email.split('@')[0]}</p>
                      <p className="text-xs text-muted-foreground">{task.assignedUser.email}</p>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground italic">Unassigned</div>
                )}
              </div>
            </CardContent>
          </Card>

          {(task.customer || task.lead) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-md flex items-center gap-2">
                  <Building className="w-4 h-4 text-primary" /> Related Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {task.customer && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Customer</p>
                    <Link href={`/customers/${task.customer.id}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-2">
                      <Building className="w-3 h-3" /> {task.customer.name}
                    </Link>
                  </div>
                )}
                {task.lead && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Lead</p>
                    <Link href={`/leads/${task.lead.id}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-2">
                      <PhoneCall className="w-3 h-3" /> {task.lead.name} {task.lead.company ? `(${task.lead.company})` : ''}
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-md">Activity Timeline</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <CustomerActivityTimeline activities={timelineEvents} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
