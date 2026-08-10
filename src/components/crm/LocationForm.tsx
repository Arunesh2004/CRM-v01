'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { createLocationAction } from '@/modules/crm/actions/customer.actions';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function LocationForm({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    formData.append('customerId', customerId);
    const res = await createLocationAction({
      customerId: formData.get('customerId') as string,
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      city: formData.get('city') as string,
      state: formData.get('state') as string,
      postalCode: formData.get('postalCode') as string,
    });
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Location created successfully');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Location
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4 border p-4 rounded-lg bg-card mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-sm">New Location</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Location Name</label>
          <input type="text" name="name" required placeholder="e.g. Headquarters, Branch Office" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Address</label>
          <input type="text" name="address" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">City</label>
          <input type="text" name="city" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">State / Province</label>
          <input type="text" name="state" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Postal Code</label>
          <input type="text" name="postalCode" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
      </div>
      <SubmitButton className="w-full">Save Location</SubmitButton>
    </form>
  );
}
