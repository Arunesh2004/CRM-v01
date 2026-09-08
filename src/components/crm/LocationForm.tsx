'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { createLocationAction, updateLocationAction } from '@/modules/crm/actions/location.actions';
import { useState } from 'react';
import { Plus, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function LocationForm({ 
  customerId,
  customers,
  initialData
}: { 
  customerId?: string;
  customers?: { id: string; name: string }[];
  initialData?: { id: string; name: string; address?: string | null; city?: string | null; state?: string | null; zip?: string | null }
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function action(formData: FormData) {
    if (customerId) {
      formData.append('customerId', customerId);
    }
    let res;
    if (initialData) {
      formData.append('id', initialData.id);
      res = await updateLocationAction({
        id: initialData.id,
        name: formData.get('name') as string,
        address: formData.get('address') as string || undefined,
        city: formData.get('city') as string || undefined,
        state: formData.get('state') as string || undefined,
        zip: formData.get('zip') as string || undefined,
      });
    } else {
      res = await createLocationAction({
        customerId: formData.get('customerId') as string,
        name: formData.get('name') as string,
        address: formData.get('address') as string || undefined,
        city: formData.get('city') as string || undefined,
        state: formData.get('state') as string || undefined,
        zip: formData.get('zip') as string || undefined,
      });
    }
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success(initialData ? 'Location updated successfully' : 'Location created successfully');
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    if (initialData) {
      return (
        <button onClick={() => setOpen(true)} className="text-violet-400 hover:text-white transition-colors font-medium text-xs bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      );
    }
    return (
      <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Location
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {initialData ? 'Edit Location' : 'New Location'}
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
            {!initialData && !customerId && customers && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer</label>
                <select name="customerId" required className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100">
                  <option value="">Select Customer</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Location Name</label>
              <input type="text" name="name" defaultValue={initialData?.name} required placeholder="e.g. Headquarters" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
              <input type="text" name="address" defaultValue={initialData?.address || ''} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
              <input type="text" name="city" defaultValue={initialData?.city || ''} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State / Province</label>
              <input type="text" name="state" defaultValue={initialData?.state || ''} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Postal Code</label>
              <input type="text" name="zip" defaultValue={initialData?.zip || ''} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-900 dark:text-slate-100" />
            </div>
          </div>
          
          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <SubmitButton>{initialData ? 'Save Changes' : 'Create Location'}</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
