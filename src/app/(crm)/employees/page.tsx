import { getEmployees } from '@/modules/users/user.service';
import { getDepartments } from '@/modules/departments/department.service';
import { requireAuth } from '@/lib/auth';
import { Suspense } from 'react';
import Link from 'next/link';

export default async function EmployeesPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  const actor = await requireAuth();
  
  // Parse Search Params
  const search = typeof searchParams.search === 'string' ? searchParams.search : undefined;
  const departmentId = typeof searchParams.departmentId === 'string' ? searchParams.departmentId : undefined;
  const roleName = typeof searchParams.roleName === 'string' ? searchParams.roleName : undefined;
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;

  const [employees, departments] = await Promise.all([
    getEmployees({ search, departmentId, roleName, status }),
    getDepartments()
  ]);

  let isTenantAdmin = false;
  let isDepartmentHead = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
    if (ur.role.name === 'DEPARTMENT_HEAD') isDepartmentHead = true;
  }
  const canManage = isTenantAdmin || isDepartmentHead;

  return (
    <div className="flex flex-col gap-6 p-6 min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">Employee Directory</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and view company personnel.</p>
        </div>
        {canManage && (
          <button className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Invite Employee
          </button>
        )}
      </div>

      {/* Filters (Basic Implementation) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 items-center">
        <form className="flex-1 min-w-[200px]" method="GET">
          <div className="relative">
            <input 
              name="search"
              defaultValue={search}
              placeholder="Search by name, email, or ID..." 
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            />
            <svg className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </form>
        {/* Simple Department Filter Dropdown (Client Component could enhance this) */}
        <select className="py-2.5 px-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none">
          <option value="">All Departments</option>
          {departments.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium rounded-xl transition-colors">
          Filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Department</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {employees.map((emp: any) => (
                <tr key={emp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/50 dark:to-purple-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shadow-inner">
                        {emp.firstName?.[0] || emp.email[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{emp.firstName ? `${emp.firstName} ${emp.lastName || ''}` : emp.email}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">{emp.employeeId || 'PENDING'}</span>
                          <span>{emp.designation || 'No Designation'}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-500"></div>
                      {emp.department?.name || 'Unassigned'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex gap-1 flex-wrap">
                      {emp.userRoles.map((ur: any) => (
                        <span key={ur.id} className="px-2 py-0.5 rounded text-[11px] font-semibold border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                          {ur.role.name.replace('_', ' ')}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold
                      ${emp.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 
                        emp.status === 'INVITED' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 
                        'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link href={`/employees/${emp.id}`} className="inline-flex items-center justify-center p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors opacity-0 group-hover:opacity-100">
                      <span className="sr-only">View Profile</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </Link>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No employees found matching the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
