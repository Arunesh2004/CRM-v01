import { requireAuth } from '@/lib/auth';
import prisma from '@db/utils/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { RoleEditModal } from '@/components/crm/RoleEditModal';

export default async function EmployeeProfilePage({ params }: { params: { employeeId: string } }) {
  const actor = await requireAuth();
  
  const employee = await prisma.user.findFirst({
    where: { id: params.employeeId, tenantId: actor.tenantId },
    include: { department: true, userRoles: { include: { role: true } } }
  });

  if (!employee) return notFound();

  let isTenantAdmin = false;
  let isDepartmentHead = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
    if (ur.role.name === 'DEPARTMENT_HEAD') isDepartmentHead = true;
  }

  // Permissions
  const isSelf = actor.id === employee.id;
  const canEditProfile = isSelf || isTenantAdmin;
  const canManageRole = isTenantAdmin;
  const canManageDept = isTenantAdmin || (isDepartmentHead && actor.departmentId === employee.departmentId);

  return (
    <div className="max-w-4xl mx-auto p-6 min-h-screen font-sans">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/employees" className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Employee Profile</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Identity Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg mb-4">
              {employee.firstName?.[0] || employee.email[0].toUpperCase()}
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {employee.firstName ? `${employee.firstName} ${employee.lastName || ''}` : 'Unnamed Employee'}
            </h2>
            <p className="text-sm text-slate-500 mb-4">{employee.designation || 'No Designation'}</p>
            
            <div className="flex gap-2 flex-wrap justify-center mb-6">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {employee.employeeId || 'PENDING'}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold
                ${employee.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                {employee.status}
              </span>
            </div>

            <div className="w-full pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex justify-between items-center text-sm mb-2">
                <span className="text-slate-500">Department</span>
                <span className="font-medium text-slate-900 dark:text-white">{employee.department?.name || 'Unassigned'}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Roles</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {employee.userRoles.map((r: any) => r.role.name.replace('_', ' ')).join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Editable Profile Details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Contact & Details</h3>
              {canEditProfile && (
                <button className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300">
                  Edit Profile
                </button>
              )}
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{employee.email}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {/* Privacy: Only show phone if self or admin */}
                  {canEditProfile ? (employee.phone || 'Not provided') : '••••••••••'}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">First Name</label>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{employee.firstName || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Last Name</label>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{employee.lastName || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Designation</label>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{employee.designation || '-'}</div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Joined Date</label>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{new Date(employee.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
          </div>

          {/* Admin Management Section */}
          {(canManageRole || canManageDept) && (
            <div className="bg-rose-50/50 dark:bg-rose-900/10 rounded-2xl border border-rose-100 dark:border-rose-900/30 shadow-sm p-6">
              <h3 className="text-lg font-bold text-rose-900 dark:text-rose-400 mb-4">Management Actions</h3>
              <div className="flex flex-wrap gap-4">
                {canManageRole && (
                  <RoleEditModal 
                    userId={employee.id} 
                    currentRole={employee.userRoles[0]?.role.name || 'MEMBER'} 
                  />
                )}
                {canManageDept && (
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:border-indigo-500 transition-colors">
                    Reassign Department
                  </button>
                )}
                {canManageRole && employee.status === 'ACTIVE' && (
                  <button className="px-4 py-2 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-900/50 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors">
                    Disable Employee
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
