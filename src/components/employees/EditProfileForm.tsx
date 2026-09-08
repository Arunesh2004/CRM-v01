'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { updateProfileAction } from '@/app/(crm)/employees/actions';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function EditProfileForm({ 
  userId,
  initialData 
}: { 
  userId: string;
  initialData: { firstName?: string | null; lastName?: string | null; phone?: string | null; designation?: string | null } 
}) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    const res = await updateProfileAction(userId, formData);
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Profile updated successfully');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <button 
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
      >
        Edit Profile
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Edit Profile
          </h2>
          <button 
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>
        
        <form action={action} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
              <input 
                type="text" 
                name="firstName" 
                defaultValue={initialData?.firstName || ''}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
              <input 
                type="text" 
                name="lastName" 
                defaultValue={initialData?.lastName || ''}
                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input 
              type="text" 
              name="phone" 
              defaultValue={initialData?.phone || ''}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Designation</label>
            <input 
              type="text" 
              name="designation" 
              defaultValue={initialData?.designation || ''}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>Save Profile</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
