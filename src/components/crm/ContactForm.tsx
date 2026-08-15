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
        <Plus className="w-4 h-4" />
        Add Contact
      </Button>
    );
  }

  const inputClass = "w-full text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent";
  const inputStyle = {
    background: 'rgba(20,27,51,.55)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: '.7rem',
    padding: '.6rem 1rem',
    color: '#E7EAF5',
    outline: 'none',
  };

  return (
    <form 
      action={action} 
      className="space-y-5 p-5 mt-4 rounded-[1.25rem] border border-white/[.08] animate-in slide-in-from-top-2"
      style={{
        background: 'linear-gradient(180deg, rgba(27,35,64,.65), rgba(13,19,38,.65))',
      }}
    >
      <div className="flex justify-between items-center mb-1">
        <h4 className="font-display font-semibold text-white">New Contact</h4>
        <button 
          type="button" 
          onClick={() => setOpen(false)} 
          className="text-xs font-medium text-[#8891B0] hover:text-white transition-colors"
        >
          Cancel
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-[#8891B0] mb-1.5">First Name</label>
          <input type="text" name="firstName" required className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#8891B0] mb-1.5">Last Name</label>
          <input type="text" name="lastName" required className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#8891B0] mb-1.5">Email</label>
          <input type="email" name="email" className={inputClass} style={inputStyle} />
        </div>
        <div>
          <label className="block text-xs font-medium text-[#8891B0] mb-1.5">Phone</label>
          <input type="text" name="phone" className={inputClass} style={inputStyle} />
        </div>
        <div className="col-span-1 sm:col-span-2">
          <label className="block text-xs font-medium text-[#8891B0] mb-1.5">Job Title</label>
          <input type="text" name="jobTitle" className={inputClass} style={inputStyle} />
        </div>
        <div className="col-span-1 sm:col-span-2 flex items-center gap-2.5 mt-1">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              name="isPrimary" 
              id="isPrimary" 
              className="peer appearance-none w-4 h-4 border border-white/20 rounded-[4px] bg-white/5 checked:bg-violet-500 checked:border-violet-500 transition-all cursor-pointer" 
            />
            <svg className="absolute w-3 h-3 left-0.5 top-0.5 pointer-events-none opacity-0 peer-checked:opacity-100 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <label htmlFor="isPrimary" className="text-xs font-medium text-[#E7EAF5] cursor-pointer">
            Set as Primary Contact
          </label>
        </div>
      </div>
      <SubmitButton className="w-full">Save Contact</SubmitButton>
    </form>
  );
}
