'use client';

import { useState } from 'react';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { deleteContactAction } from '@/modules/crm/actions/customer.actions';
import { toast } from 'sonner';
import { ContactForm } from './ContactForm';
import { CustomerContact } from '@prisma/client';

export function ContactCardActions({ customerId, contact }: { customerId: string; contact: CustomerContact }) {
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to archive this contact?')) return;
    const res = await deleteContactAction({ contactId: contact.id, customerId });
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Contact archived successfully');
    }
  };

  if (isEditOpen) {
    return (
      <div className="absolute inset-0 z-50 bg-[#0D1326]/95 p-4 rounded-xl flex items-center justify-center backdrop-blur-sm">
        <div className="w-full max-w-md">
          <ContactForm customerId={customerId} contact={contact} onClose={() => setIsEditOpen(false)} />
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-8 w-8 text-[#8891B0] hover:text-white hover:bg-white/10 inline-flex items-center justify-center rounded-md outline-none">
        <MoreHorizontal className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40 bg-[#1A223B] border-white/10 text-[#E7EAF5]">
        <DropdownMenuItem onClick={() => setIsEditOpen(true)} className="cursor-pointer hover:bg-white/5 focus:bg-white/5">
          <Edit className="mr-2 h-4 w-4 text-violet-400" />
          <span>Edit</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-300">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Archive</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
