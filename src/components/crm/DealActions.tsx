'use client';
import { Deal, Pipeline, PipelineStage, User } from '@prisma/client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { archiveDealAction } from '@/modules/crm/actions/deal.actions';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EditDealForm } from './EditDealForm';

export function DealActions({ 
  deal, 
  pipelines, 
  assignableUsers = [] 
}: { 
  deal: Deal & { stage: PipelineStage };
  pipelines: (Pipeline & { stages: PipelineStage[] })[];
  assignableUsers?: { id: string; email: string }[];
}) {
  const router = useRouter();

  const handleArchive = async () => {
    const res = await archiveDealAction(deal.id);
    if (res.success) {
      toast.success('Deal archived successfully');
      router.push('/deals');
    } else {
      toast.error('Error archiving deal: ' + res.error);
    }
  };

  return (
    <div className="flex space-x-2 mt-4">
      <EditDealForm deal={deal} pipelines={pipelines} assignableUsers={assignableUsers} />
      
      <ConfirmDialog
        title="Archive Deal"
        description="Are you sure you want to archive this deal? It will be hidden from active pipelines."
        confirmText="Archive"
        onConfirm={handleArchive}
        trigger={
          <Button variant="ghost" className="bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 hover:text-rose-300">
            Archive
          </Button>
        }
      />
    </div>
  );
}
