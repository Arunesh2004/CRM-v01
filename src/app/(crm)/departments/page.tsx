import { getDepartments } from '@/modules/departments/department.service';
import { requireAuth } from '@/lib/auth';
import { DepartmentForm } from '@/components/departments/DepartmentForm';

export default async function DepartmentsPage() {
  const actor = await requireAuth();
  
  let isTenantAdmin = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
  }

  const departments = await getDepartments();

  return (
    <div className="p-6 max-w-6xl mx-auto min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Departments</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Organize your organization structure.</p>
        </div>
        {isTenantAdmin && (
          <DepartmentForm />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {departments.map((dept) => (
          <div key={dept.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><path d="m22 20-2-2-4 4-4-4-2 2-4-4-4 4"/><path d="M4 14v6"/><path d="M4 10v.01"/><path d="M4 6v.01"/><path d="M20 14v6"/><path d="M20 10v.01"/><path d="M20 6v.01"/></svg>
              </div>
              {isTenantAdmin && (
                <DepartmentForm initialData={{ id: dept.id, name: dept.name, description: dept.description }} />
              )}
            </div>
            
            <h3 className="text-lg font-bold mb-2">{dept.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex-grow">{dept.description || 'No description provided.'}</p>
            
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{(dept)._count?.users || 0} Employees</span>
              </div>
            </div>
          </div>
        ))}
        
        {departments.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
            No departments configured yet.
          </div>
        )}
      </div>
    </div>
  );
}
