'use client';

import { deleteCustomerAction } from '@/modules/crm/actions/customer.actions';

import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function CustomerActions({ customerId }: { customerId: string }) {
  const router = useRouter();

  const handleDelete = async () => {
    const res = await deleteCustomerAction(customerId);
    if (res.success) {
      toast.success('Customer deleted successfully');
      router.refresh();
    } else {
      toast.error('Error deleting customer: ' + res.error);
    }
  };

  return (
    <ConfirmDialog
      title="Delete Customer"
      description="Are you sure you want to delete this customer? This action cannot be undone."
      confirmText="Delete"
      onConfirm={handleDelete}
      trigger={
        <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
          Delete
        </Button>
      }
    />
  );
}
