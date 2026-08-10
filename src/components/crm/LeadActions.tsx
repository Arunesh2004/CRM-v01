'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { assignLeadAction, convertLeadAction, deleteLeadAction } from '@/modules/crm/actions/lead.actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Loader2 } from 'lucide-react';

export function LeadActions({ leadId, users }: { leadId: string; users: { id: string; email: string }[] }) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  const handleAssign = async () => {
    if (!selectedUserId) return;
    setIsSaving(true);
    const res = await assignLeadAction(leadId, selectedUserId);
    setIsSaving(false);
    if (res.success) {
      toast.success('Lead assigned successfully');
      setIsAssigning(false);
      router.refresh();
    } else {
      toast.error('Error assigning lead: ' + res.error);
    }
  };

  const handleConvert = async () => {
    const res = await convertLeadAction(leadId);
    if (res.success) {
      toast.success('Lead converted to customer successfully');
      router.refresh();
    } else {
      toast.error('Error converting lead: ' + res.error);
    }
  };

  const handleDelete = async () => {
    const res = await deleteLeadAction(leadId);
    if (res.success) {
      toast.success('Lead deleted successfully');
      router.refresh();
    } else {
      toast.error('Error deleting lead: ' + res.error);
    }
  };

  return (
    <div className="flex flex-col space-y-2 mt-3 pt-3 border-t border-muted/50 text-xs">
      <div className="flex space-x-2 justify-end">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsAssigning(!isAssigning)} 
          className="text-[10px] h-6 px-2"
        >
          Assign
        </Button>
        <ConfirmDialog
          title="Convert Lead"
          description="Are you sure you want to convert this lead to a customer? This will generate a new customer profile."
          confirmText="Convert"
          variant="default"
          onConfirm={handleConvert}
          trigger={
            <Button variant="outline" size="sm" className="text-green-600 hover:text-green-700 hover:bg-green-50 text-[10px] h-6 px-2">
              Convert
            </Button>
          }
        />
        <ConfirmDialog
          title="Delete Lead"
          description="Are you sure you want to delete this lead? This action cannot be undone."
          confirmText="Delete"
          onConfirm={handleDelete}
          trigger={
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 text-[10px] h-6 px-2">
              Delete
            </Button>
          }
        />
      </div>

      {isAssigning && (
        <div className="flex space-x-2 mt-2">
          <select 
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="border border-border bg-background rounded px-1 py-1 flex-1 text-foreground"
          >
            <option value="">Select User...</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.email}</option>
            ))}
          </select>
          <Button size="sm" className="h-6 text-[10px]" onClick={handleAssign} disabled={isSaving}>
            {isSaving && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            Save
          </Button>
        </div>
      )}
    </div>
  );
}
