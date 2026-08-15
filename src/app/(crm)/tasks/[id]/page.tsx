import { notFound } from 'next/navigation';
import { getTaskByIdAction } from '@/modules/crm/actions/task.actions';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { CustomerActivityTimeline } from '@/components/crm/CustomerActivityTimeline';
import { UnifiedTimelineItem } from '@/modules/crm/crm.types';
import { AlertCircle, Calendar, CheckSquare, Clock, User, Building, PhoneCall, ArrowLeft } from 'lucide-react';
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/tasks" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Tasks
        </Link>
      </div>

      <div className="glass-panel p-6 sm:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 space-y-2 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold tracking-tight text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                <CheckSquare className="w-5 h-5 text-violet-400" />
              </div>
              {task.title}
            </h1>
            {isOverdue && (
              <Badge variant="rose" className="animate-pulse flex items-center gap-1 ml-2">
                <AlertCircle className="w-3 h-3" /> OVERDUE
              </Badge>
            )}
          </div>
          <div className="text-sm text-[#8891B0] flex items-center gap-4 flex-wrap ml-14">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 opacity-70" /> 
              Created {format(new Date(task.createdAt), 'MMM d, yyyy')}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 opacity-70" /> 
              Due: {task.dueDate ? format(new Date(task.dueDate), 'MMM d, yyyy h:mm a') : 'No due date'}
            </span>
          </div>
        </div>
        <div className="relative z-10 flex items-center gap-3 mt-2 md:mt-0 ml-14 md:ml-0">
          <Badge variant={task.status === 'COMPLETED' ? 'emerald' : task.status === 'IN_PROGRESS' ? 'amber' : 'slate'} className="px-3 py-1 text-xs uppercase font-semibold h-auto">
            {task.status.replace('_', ' ')}
          </Badge>
          <Badge variant={getPriorityColor(task.priority).includes('red') || getPriorityColor(task.priority).includes('orange') ? 'rose' : getPriorityColor(task.priority).includes('blue') ? 'violet' : 'slate'} className="px-3 py-1 text-xs uppercase font-semibold h-auto">
            {task.priority}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Task Description</h3>
            <div className="text-sm text-[#E7EAF5] leading-relaxed whitespace-pre-wrap min-h-[100px] bg-[#0D1326]/30 p-4 rounded-xl border border-white/[.04]">
              {task.description || <span className="text-[#8891B0] italic">No description provided.</span>}
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="text-lg font-display font-semibold text-white mb-4">Discussion</h3>
            <TaskComments taskId={task.id} initialComments={task.comments} />
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h3 className="text-md font-display font-semibold text-white flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-violet-400" /> Assignment
            </h3>
            <div className="flex items-center gap-4 p-4 rounded-xl border border-white/[.04] bg-[#0D1326]/40">
              {task.assignedUser ? (
                <>
                  <div className="w-10 h-10 rounded-full bg-violet-500/20 text-violet-400 flex items-center justify-center uppercase font-bold border border-violet-500/30">
                    {task.assignedUser.email.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{task.assignedUser.email.split('@')[0]}</p>
                    <p className="text-xs text-[#8891B0] mt-0.5">{task.assignedUser.email}</p>
                  </div>
                </>
              ) : (
                <div className="text-sm text-[#8891B0] italic">Unassigned</div>
              )}
            </div>
          </div>

          {(task.customer || task.lead) && (
            <div className="glass-panel p-6">
              <h3 className="text-md font-display font-semibold text-white flex items-center gap-2 mb-4">
                <Building className="w-4 h-4 text-cyan-400" /> Related Context
              </h3>
              <div className="space-y-4">
                {task.customer && (
                  <div className="p-3 rounded-lg border border-white/[.04] bg-[#0D1326]/30">
                    <p className="text-[10px] text-[#8891B0] font-medium uppercase tracking-wider mb-1">Customer</p>
                    <Link href={`/customers/${task.customer.id}`} className="text-sm font-medium text-white hover:text-cyan-400 transition-colors flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-cyan-500/70" /> {task.customer.name}
                    </Link>
                  </div>
                )}
                {task.lead && (
                  <div className="p-3 rounded-lg border border-white/[.04] bg-[#0D1326]/30">
                    <p className="text-[10px] text-[#8891B0] font-medium uppercase tracking-wider mb-1">Lead</p>
                    <Link href={`/leads/${task.lead.id}`} className="text-sm font-medium text-white hover:text-cyan-400 transition-colors flex items-center gap-2">
                      <PhoneCall className="w-3.5 h-3.5 text-cyan-500/70" /> {task.lead.name} {task.lead.company ? `(${task.lead.company})` : ''}
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="glass-panel p-6">
            <h3 className="text-md font-display font-semibold text-white mb-4">Activity Timeline</h3>
            <CustomerActivityTimeline activities={timelineEvents} />
          </div>
        </div>
      </div>
    </div>
  );
}
