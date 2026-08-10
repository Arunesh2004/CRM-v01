'use client';

import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { removeEmployeeAction } from './actions';

export function RemoveEmployeeForm({ employeeId }: { employeeId: string }) {
  const handleRemove = async () => {
    const res = await removeEmployeeAction(employeeId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Employee removed successfully');
    }
  };

  return (
    <ConfirmDialog
      title="Remove Employee"
      description="Are you sure you want to remove this employee from the organization? This action cannot be undone and they will lose all access immediately."
      confirmText="Remove Employee"
      onConfirm={handleRemove}
      trigger={
        <Button variant="ghost" className="text-red-600 hover:text-red-900 hover:bg-red-50" size="sm">
          Remove
        </Button>
      }
    />
  );
}
