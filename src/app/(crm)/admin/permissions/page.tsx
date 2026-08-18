import { getRolesAction } from '@/modules/admin/actions/role.actions';
import { Card } from '@/components/ui/Card';
import { ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function AdminPermissionsPage() {
  const result = await getRolesAction();
  const roles = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-cyan-400" /> Custom Roles & Permissions
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage access control and feature restrictions.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Role Name</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Description</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Permissions Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {roles?.map((role: any) => (
                <tr key={role.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{role.name}</p>
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">{role.description || '-'}</td>
                  <td className="px-6 py-4">
                    <Badge variant="slate">{role.permissions?.length || 0} permissions</Badge>
                  </td>
                </tr>
              ))}
              {(!roles || roles.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[#8891B0]">
                    No custom roles found.
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
