import { getUsersAction } from '@/modules/admin/actions/user.actions';
import { Card } from '@/components/ui/Card';
import { Users, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function AdminUsersPage() {
  const result = await getUsersAction();
  const users = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-violet-400" /> User Management
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage tenant users and roles.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">User</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Role</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {users?.map((user: any) => (
                <tr key={user.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{user.email}</p>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="cyan"><Shield className="w-3 h-3 mr-1"/>{user.role}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    {user.isActive ? (
                      <Badge variant="emerald">Active</Badge>
                    ) : (
                      <Badge variant="slate">Inactive</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">{new Date(user.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
              {(!users || users.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#8891B0]">
                    No users found.
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
