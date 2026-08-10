'use client';

import { toast } from 'sonner';
import { updateEmployeeRoleAction } from './actions';

export function UpdateRoleForm({ employeeId, currentRole }: { employeeId: string, currentRole: string }) {
  async function action(formData: FormData) {
    const res = await updateEmployeeRoleAction(employeeId, formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Role updated successfully');
    }
  }

  return (
    <form action={action} className="inline-block relative">
      <select 
        name="roleName" 
        defaultValue={currentRole}
        onChange={(e) => e.target.form?.requestSubmit()}
        className="px-2 py-1 bg-muted rounded-md text-xs border-none outline-none font-medium text-foreground cursor-pointer"
      >
        <option value="MEMBER">MEMBER</option>
        <option value="TENANT_ADMIN">ADMIN</option>
      </select>
    </form>
  );
}
