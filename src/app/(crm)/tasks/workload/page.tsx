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
      <div className="p-12 text-center text-[#8891B0]">
        Failed to load workload metrics.
      </div>
    );
  }

  const metrics: any[] = result.data;

  const totalActive = metrics.reduce((acc, curr) => acc + curr.active, 0);
  const totalCompleted = metrics.reduce((acc, curr) => acc + curr.completed, 0);
  const totalOverdue = metrics.reduce((acc, curr) => acc + curr.overdue, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 max-w-6xl mx-auto">
      <div className="border-b border-white/[.08] pb-6">
        <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
          <BarChart className="w-8 h-8 text-violet-400" /> Team Workload
        </h1>
        <p className="text-[#8891B0] mt-2">Overview of task distribution and performance across the team.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="glass-panel border-cyan-500/20 bg-cyan-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <ListTodo className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-cyan-400 mb-1">Total Active Tasks</p>
              <h2 className="text-4xl font-display font-bold text-white">{totalActive}</h2>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-panel border-emerald-500/20 bg-emerald-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <CheckSquare className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-1">Total Completed</p>
              <h2 className="text-4xl font-display font-bold text-white">{totalCompleted}</h2>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel border-rose-500/20 bg-rose-500/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-10 -mt-10 transition-transform group-hover:scale-150 duration-700"></div>
          <CardContent className="p-6 flex items-center gap-5 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.2)]">
              <AlertCircle className="w-7 h-7" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-rose-400 mb-1">Total Overdue</p>
              <h2 className="text-4xl font-display font-bold text-white">{totalOverdue}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-panel border-white/[.08]">
        <CardHeader className="border-b border-white/[.04] pb-4">
          <CardTitle className="text-lg text-white font-display">Employee Breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {metrics.map((m: any) => (
              <div key={m.user.id} className="flex flex-col md:flex-row md:items-center gap-6 p-5 rounded-xl border border-white/[.08] bg-[#06080F]/50 hover:bg-white/[.02] transition-all hover:border-violet-500/30 group">
                <div className="flex items-center gap-4 md:w-1/4">
                  <div className="shrink-0 w-12 h-12 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold uppercase shadow-[0_0_15px_rgba(124,92,252,0.1)]">
                    {m.user.firstName ? m.user.firstName.charAt(0) : m.user.email.charAt(0)}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-white truncate">{m.user.firstName ? `${m.user.firstName} ${m.user.lastName}` : m.user.email}</p>
                    <p className="text-xs text-[#8891B0] truncate font-mono mt-0.5">{m.user.email}</p>
                  </div>
                </div>
                
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-[#8891B0]">Completion Rate</span>
                    <span className={m.completionPercentage < 50 ? 'text-amber-400' : 'text-emerald-400'}>
                      {m.completionPercentage}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-white/[.04] rounded-full overflow-hidden border border-white/[.02]">
                    <div 
                      className={`h-full ${m.completionPercentage < 50 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.8)]' : 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]'}`} 
                      style={{ width: `${m.completionPercentage}%` }} 
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 md:w-1/3 justify-end text-sm">
                  <div className="text-center px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 group-hover:bg-cyan-500/20 transition-colors">
                    <span className="font-bold text-lg">{m.active}</span>
                    <span className="text-[9px] uppercase tracking-widest block opacity-80 mt-0.5">Active</span>
                  </div>
                  <div className="text-center px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors">
                    <span className="font-bold text-lg">{m.completed}</span>
                    <span className="text-[9px] uppercase tracking-widest block opacity-80 mt-0.5">Done</span>
                  </div>
                  <div className={`text-center px-4 py-2 rounded-lg border transition-colors ${m.overdue > 0 ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 group-hover:bg-rose-500/20' : 'bg-white/5 border-white/[.08] text-[#8891B0]'}`}>
                    <span className="font-bold text-lg">{m.overdue}</span>
                    <span className="text-[9px] uppercase tracking-widest block opacity-80 mt-0.5">Overdue</span>
                  </div>
                </div>
              </div>
            ))}
            
            {metrics.length === 0 && (
              <div className="text-center py-12 text-[#8891B0]">
                No users found in this tenant.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
