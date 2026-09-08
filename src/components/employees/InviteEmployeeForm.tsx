'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { inviteEmployeeAction } from '@/app/(crm)/employees/actions';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InviteEmployeeForm({ 
  departments 
}: { 
  departments: { id: string; name: string }[] 
}) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    const res = await inviteEmployeeAction(formData);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Employee invited successfully');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Invite Employee
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Invite Employee
          </h2>
          <button 
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>
        
        <form action={action} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
            <input 
              type="email" 
              name="email" 
              required 
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role</label>
            <select 
              name="roleName" 
              defaultValue="MEMBER"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
            >
              <option value="MEMBER">Member</option>
              <option value="DEPARTMENT_HEAD">Department Head</option>
              <option value="TENANT_ADMIN">Tenant Admin</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Department</label>
            <select 
              name="departmentId"
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
            >
              <option value="">None</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>Send Invitation</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
