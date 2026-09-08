'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { reassignDepartmentAction } from '@/app/(crm)/employees/actions';

export function ReassignDepartmentForm({ 
  userId,
  currentDepartmentId,
  departments 
}: { 
  userId: string;
  currentDepartmentId: string | null;
  departments: { id: string; name: string }[] 
}) {
  async function action(formData: FormData) {
    const res = await reassignDepartmentAction(userId, formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Department reassigned successfully');
    }
  }

  return (
    <form action={action} className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
      <select 
        name="departmentId" 
        defaultValue={currentDepartmentId || ''}
        className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100 text-sm"
      >
        <option value="" disabled>Select Department</option>
        {departments.map(d => (
          <option key={d.id} value={d.id}>{d.name}</option>
        ))}
      </select>
      <SubmitButton variant="outline" size="sm" className="px-4 py-2 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-500 text-sm">
        Reassign
      </SubmitButton>
    </form>
  );
}
