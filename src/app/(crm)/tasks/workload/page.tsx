import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/Card';
import { getTaskWorkloadMetricsAction } from '@/modules/crm/actions/task.actions';
import { requirePermission } from '@/lib/auth';
import { notFound } from 'next/navigation';
import { BarChart, CheckSquare, AlertCircle, ListTodo } from 'lucide-react';


export default async function TaskWorkloadPage() {
  // Check permission for manager view. Usually 'USER' 'READ' or specific 'REPORTS' 'READ'.
  try {
    await requirePermission('USER', 'READ');
  } catch {
    notFound();
  }

  const result = await getTaskWorkloadMetricsAction();
  if (!result.success || !result.data) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Failed to load workload metrics.
      </div>
    );
  }

  const metrics: any[] = result.data;

  const totalActive = metrics.reduce((acc, curr) => acc + curr.active, 0);
  const totalCompleted = metrics.reduce((acc, curr) => acc + curr.completed, 0);
  const totalOverdue = metrics.reduce((acc, curr) => acc + curr.overdue, 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-primary flex items-center gap-2">
          <BarChart className="w-6 h-6" /> Team Workload
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of task distribution and performance across the team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Active Tasks</p>
              <h2 className="text-3xl font-bold text-foreground">{totalActive}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-400">
              <CheckSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Completed</p>
              <h2 className="text-3xl font-bold text-foreground">{totalCompleted}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Overdue</p>
              <h2 className="text-3xl font-bold text-foreground">{totalOverdue}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Employee Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {metrics.map((m: any) => (
              <div key={m.user.id} className="flex flex-col md:flex-row md:items-center gap-6 p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4 md:w-1/4">
                  <div className="shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                    {m.user.firstName ? m.user.firstName.charAt(0) : m.user.email.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate">{m.user.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.user.email}</p>
                    <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-muted-foreground">Completion Rate</span>
                    <span className={m.completionPercentage < 50 ? 'text-orange-500' : 'text-green-500'}>
                      {m.completionPercentage}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${m.completionPercentage < 50 ? 'bg-orange-500' : 'bg-green-500'}`} 
                      style={{ width: `${m.completionPercentage}%` }} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 md:w-1/3 justify-end text-sm">
                  <div className="text-center px-3 py-1 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    <span className="font-bold">{m.active}</span>
                    <span className="text-[10px] uppercase block opacity-70">Active</span>
                  </div>
                  <div className="text-center px-3 py-1 rounded bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <span className="font-bold">{m.completed}</span>
                    <span className="text-[10px] uppercase block opacity-70">Done</span>
                  </div>
                  <div className={`text-center px-3 py-1 rounded ${m.overdue > 0 ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                    <span className="font-bold">{m.overdue}</span>
                    <span className="text-[10px] uppercase block opacity-70">Overdue</span>
                  </div>
                </div>
              </div>
            ))}
            
            {metrics.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No users found in this tenant.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
