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
        <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Email Address</label>
        <input 
          type="email" 
          name="email" 
          required 
          className="w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent" 
          style={{
            background: 'rgba(20,27,51,.55)',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '.7rem',
            padding: '.6rem 1rem',
            color: '#E7EAF5',
            outline: 'none',
          }}
          placeholder="employee@company.com" 
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-[#8891B0] mb-1.5">Role</label>
        <select 
          name="roleName" 
          className="w-full text-sm transition-all focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent appearance-none cursor-pointer"
          style={{
            background: 'rgba(20,27,51,.55) url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%238891B0%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E") no-repeat right .8rem top 50%',
            backgroundSize: '.65rem auto',
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: '.7rem',
            padding: '.6rem 2rem .6rem 1rem',
            color: '#E7EAF5',
            outline: 'none',
          }}
        >
          <option value="MEMBER" style={{ background: '#0D1326', color: '#E7EAF5' }}>Member</option>
          <option value="TENANT_ADMIN" style={{ background: '#0D1326', color: '#E7EAF5' }}>Admin</option>
        </select>
      </div>
      <SubmitButton className="w-full" loadingText="Sending Invitation...">
        Send Invitation
      </SubmitButton>
    </form>
  );
}
