'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { createDepartmentAction, updateDepartmentAction } from '@/app/(crm)/departments/actions';
import { useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DepartmentForm({ 
  initialData 
}: { 
  initialData?: { id: string; name: string; description?: string | null } 
}) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    let res;
    if (initialData) {
      formData.append('id', initialData.id);
      res = await updateDepartmentAction(formData);
    } else {
      res = await createDepartmentAction(formData);
    }
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(initialData ? 'Department updated' : 'Department created');
      setOpen(false);
    }
  }

  if (!open) {
    if (initialData) {
      return (
        <button 
          onClick={() => setOpen(true)}
          className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          <Edit2 className="w-4 h-4" />
        </button>
      );
    }
    return (
      <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2">
        <Plus className="w-4 h-4" />
        New Department
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {initialData ? 'Edit Department' : 'New Department'}
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
            <input 
              type="text" 
              name="name" 
              defaultValue={initialData?.name}
              required 
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" 
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
            <textarea 
              name="description" 
              defaultValue={initialData?.description || ''}
              rows={3}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none text-slate-900 dark:text-slate-100" 
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>{initialData ? 'Save Changes' : 'Create Department'}</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
