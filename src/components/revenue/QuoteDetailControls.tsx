'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { submitQuoteForApprovalAction, approveQuoteAction, acceptQuoteAction, sendQuoteAction, createQuoteRevisionAction } from '@/modules/revenue/actions/revenue.actions';

import { useRouter } from 'next/navigation';

export function QuoteDetailControls({
  quoteId,
  status,
  isOwner,
  isApprover
}: {
  quoteId: string;
  status: string;
  isOwner: boolean;
  isApprover: boolean;
}) {
  const router = useRouter();

  async function handleSubmit() {
    const res = await submitQuoteForApprovalAction(quoteId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Quote submitted for approval');
      router.refresh();
    }
  }

  async function handleApprove() {
    const res = await approveQuoteAction(quoteId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Quote approved');
      router.refresh();
    }
  }

  async function handleSend() {
    const res = await sendQuoteAction(quoteId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Quote sent');
      router.refresh();
    }
  }

  async function handleAccept() {
    const res = await acceptQuoteAction(quoteId);
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Quote accepted');
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {status === 'DRAFT' && isOwner && (
        <form action={handleSubmit}>
          <SubmitButton className="w-full bg-amber-500 hover:bg-amber-600 text-white">
            Submit for Approval
          </SubmitButton>
        </form>
      )}
      
      {status === 'PENDING_APPROVAL' && isApprover && (
        <form action={handleApprove}>
          <SubmitButton className="w-full bg-cyan-600 hover:bg-cyan-700 text-white">
            Approve Quote
          </SubmitButton>
        </form>
      )}

      {status === 'APPROVED' && isOwner && (
        <form action={handleSend}>
          <SubmitButton className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
            Send Quote
          </SubmitButton>
        </form>
      )}

      {status === 'SENT' && isOwner && (
        <form action={handleAccept}>
          <SubmitButton className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
            Accept Quote
          </SubmitButton>
        </form>
      )}

      {status !== 'ACCEPTED' && isOwner && (
        <form action={async () => {
          const res = await createQuoteRevisionAction(quoteId);
          if (res?.error) toast.error(res.error);
          else {
            toast.success('Quote revision created');
            router.push(`/quotes/${res.data.id}`);
          }
        }}>
          <SubmitButton className="w-full bg-violet-600 hover:bg-violet-700 text-white">
            Create Revision
          </SubmitButton>
        </form>
      )}
      
      {!(status === 'DRAFT' && isOwner) && 
       !(status === 'PENDING_APPROVAL' && isApprover) && 
       !(status === 'APPROVED' || status === 'SENT') && 
       status === 'ACCEPTED' && (
        <p className="text-sm text-[#8891B0] text-center italic">No actions available in current state.</p>
      )}
    </div>
  );
}
