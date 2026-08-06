'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateLeadAction } from '@/modules/crm/actions/lead.actions';

const STATUSES = ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST'] as const;

export function StatusUpdater({ leadId, currentStatus }: { leadId: string, currentStatus: string }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const router = useRouter();

  async function handleStatusChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newStatus = e.target.value;
    setIsUpdating(true);
    
    const res = await updateLeadAction({ id: leadId, status: newStatus as any });
    
    setIsUpdating(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Failed to update status');
    }
  }

  return (
    <select 
      value={currentStatus}
      onChange={handleStatusChange}
      disabled={isUpdating}
      className="text-xs border rounded p-1 bg-gray-50 disabled:opacity-50"
    >
      {STATUSES.map(status => (
        <option key={status} value={status}>{status}</option>
      ))}
    </select>
  );
}
