'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { inviteEmployeeAction } from './actions';

export function EmployeeInviteForm() {
  async function action(formData: FormData) {
    const res = await inviteEmployeeAction(formData);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Employee invited successfully');
    }
  }

  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Email Address</label>
        <input type="email" name="email" required className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm" placeholder="employee@company.com" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Role</label>
        <select name="roleName" className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 text-sm">
          <option value="MEMBER">Member</option>
          <option value="TENANT_ADMIN">Admin</option>
        </select>
      </div>
      <SubmitButton className="w-full" loadingText="Sending Invitation...">
        Send Invitation
      </SubmitButton>
    </form>
  );
}
