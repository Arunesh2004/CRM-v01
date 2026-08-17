import { getDepartments } from '@/modules/departments/department.service';
import { requireAuth } from '@/lib/auth';

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
          <p className="text-sm text-slate-500 mt-1">Manage company divisions and their respective heads.</p>
        </div>
        {isTenantAdmin && (
          <button className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all active:scale-95 text-sm flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            New Department
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {departments.map((dept: any) => (
          <div key={dept.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-md transition-all flex flex-col h-full group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xl">
                {dept.name.substring(0, 2).toUpperCase()}
              </div>
              {isTenantAdmin && (
                <button className="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                </button>
              )}
            </div>
            
            <h3 className="text-lg font-bold mb-2">{dept.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 flex-grow">{dept.description || 'No description provided.'}</p>
            
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{(dept as any)._count?.users || 0} Employees</span>
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
