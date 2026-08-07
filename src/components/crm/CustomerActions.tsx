'use client';

import { deleteCustomerAction } from '@/modules/crm/actions/customer.actions';

export function CustomerActions({ customerId }: { customerId: string }) {
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this customer?')) {
      const res = await deleteCustomerAction(customerId);
      if (res.success) {
        alert('Customer deleted successfully');
        window.location.reload();
      } else {
        alert('Error deleting customer: ' + res.error);
      }
    }
  };

  return (
    <button onClick={handleDelete} className="text-red-600 ml-4 hover:underline">
      Delete
    </button>
  );
}
