import { getFieldSecurityAction } from '@/modules/admin/actions/field-security.actions';
import { Card } from '@/components/ui/Card';
import { Lock, EyeOff } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function AdminFieldSecurityPage() {
  const result = await getFieldSecurityAction();
  const configs = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-rose-400" /> Field Security Profiles
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage field-level data masking and visibility rules.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Resource</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Role</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Rules</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {configs?.map((config: any) => (
                <tr key={config.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">{config.resource}</td>
                  <td className="px-6 py-4 text-[#8891B0]">{config.roleName}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2 flex-wrap">
                      {config.rules?.map((rule: any) => (
                        <Badge key={rule.id} variant="slate" className="flex items-center gap-1">
                           <EyeOff className="w-3 h-3"/> {rule.fieldName} ({rule.maskType})
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {(!configs || configs.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[#8891B0]">
                    No field security profiles found.
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
