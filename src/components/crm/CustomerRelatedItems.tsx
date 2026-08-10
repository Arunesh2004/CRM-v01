import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Target, CheckSquare, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export function CustomerRelatedItems({ tasks, leads }: { tasks: any[], leads: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center">
            <CheckSquare className="w-5 h-5 mr-2 text-primary" />
            Related Tasks
          </CardTitle>
          <Badge variant="secondary" className="bg-muted">{tasks?.length || 0}</Badge>
        </CardHeader>
        <CardContent>
          {(!tasks || tasks.length === 0) ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No active tasks for this customer.
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {tasks.map(task => (
                <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-accent transition-colors bg-card text-sm">
                  <div className="font-medium text-foreground truncate max-w-[200px]" title={task.title}>{task.title}</div>
                  <Badge variant={task.status === 'COMPLETED' ? 'success' : 'secondary'} className="text-[10px]">
                    {task.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg flex items-center">
            <Target className="w-5 h-5 mr-2 text-primary" />
            Related Leads
          </CardTitle>
          <Badge variant="secondary" className="bg-muted">{leads?.length || 0}</Badge>
        </CardHeader>
        <CardContent>
          {(!leads || leads.length === 0) ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No historical leads found.
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {leads.map(lead => (
                <div key={lead.id} className="flex items-center justify-between p-3 border rounded-lg hover:border-accent transition-colors bg-card text-sm">
                  <div>
                    <div className="font-medium text-foreground truncate max-w-[150px]">{lead.name}</div>
                    <div className="text-xs text-muted-foreground">{lead.email || 'No email'}</div>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {lead.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
