import { getWorkflowsAction } from '@/modules/admin/actions/workflow.actions';
import { Card } from '@/components/ui/Card';
import { Share2, Play } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function AdminWorkflowsPage() {
  const result = await getWorkflowsAction();
  const workflows = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-400" /> Automation Workflows
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Configure automatic actions and multi-step approvals.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Workflow Name</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Trigger</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {workflows?.map((wf: any) => (
                <tr key={wf.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">{wf.name}</td>
                  <td className="px-6 py-4 text-[#8891B0]">{wf.triggerType}</td>
                  <td className="px-6 py-4">
                    {wf.isActive ? (
                      <Badge variant="emerald"><Play className="w-3 h-3 mr-1"/>Active</Badge>
                    ) : (
                      <Badge variant="slate">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {(!workflows || workflows.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[#8891B0]">
                    No automation workflows found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
