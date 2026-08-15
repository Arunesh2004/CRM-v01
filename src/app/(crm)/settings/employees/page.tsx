import { getEmployees } from '@/modules/users/user.service';
import { EmployeeInviteForm } from './EmployeeInviteForm';
import { RemoveEmployeeForm } from './RemoveEmployeeForm';
import { UpdateRoleForm } from './UpdateRoleForm';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';

export default async function EmployeesPage() {
  const employees = await getEmployees();

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10">
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Employee Management</h1>
          <p className="text-sm text-[#8891B0] mt-1">Manage your team members and their roles within the department.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invite Panel */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel p-6">
            <h3 className="font-display font-semibold text-white mb-5">Invite New Employee</h3>
            <EmployeeInviteForm />
          </div>
        </div>
        
        {/* Employee Table */}
        <div className="lg:col-span-2">
          <div className="glass-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/[.08] text-xs font-medium text-[#8891B0] uppercase tracking-wider" style={{ background: 'rgba(20,27,51,.3)' }}>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Joined</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[.04]">
                  {employees.map((emp: any) => (
                    <tr key={emp.id} className="hover:bg-white/[.02] transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{emp.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <UpdateRoleForm 
                          employeeId={emp.id} 
                          currentRole={emp.userRoles?.[0]?.role?.name || 'MEMBER'} 
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {emp.status === 'ACTIVE' ? (
                          <Badge variant="emerald">ACTIVE</Badge>
                        ) : (
                          <Badge variant="slate">{emp.status}</Badge>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-[#8891B0]">
                        {format(new Date(emp.createdAt), 'MMM d, yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <RemoveEmployeeForm employeeId={emp.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
