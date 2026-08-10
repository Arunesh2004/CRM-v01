'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { createContactAction } from '@/modules/crm/actions/customer.actions';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ContactForm({ customerId }: { customerId: string }) {
  const [open, setOpen] = useState(false);

  async function action(formData: FormData) {
    formData.append('customerId', customerId);
    const res = await createContactAction({
      customerId: formData.get('customerId') as string,
      firstName: formData.get('firstName') as string,
      lastName: formData.get('lastName') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      jobTitle: formData.get('jobTitle') as string,
      isPrimary: formData.get('isPrimary') === 'on',
    });
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Contact created successfully');
      setOpen(false);
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        Add Contact
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-4 border p-4 rounded-lg bg-card mt-4">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-sm">New Contact</h4>
        <button type="button" onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground text-xs">Cancel</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1">First Name</label>
          <input type="text" name="firstName" required className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Last Name</label>
          <input type="text" name="lastName" required className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Email</label>
          <input type="email" name="email" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Phone</label>
          <input type="text" name="phone" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium mb-1">Job Title</label>
          <input type="text" name="jobTitle" className="w-full border rounded-md p-2 text-sm bg-background" />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input type="checkbox" name="isPrimary" id="isPrimary" className="rounded" />
          <label htmlFor="isPrimary" className="text-xs font-medium">Set as Primary Contact</label>
        </div>
      </div>
      <SubmitButton className="w-full">Save Contact</SubmitButton>
    </form>
  );
}
