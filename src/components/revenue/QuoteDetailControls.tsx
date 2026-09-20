'use client';

import { useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { submitQuoteForApprovalAction, approveQuoteAction, acceptQuoteAction, sendQuoteAction, createQuoteRevisionAction } from '@/modules/revenue/actions/revenue.actions';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function QuoteDetailControls({
  quoteId,
  status,
  isOwner,
  isApprover,
}: {
  quoteId: string;
  status: string;
  isOwner: boolean;
  isApprover: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    startTransition(async () => {
      try {
        const res = await submitQuoteForApprovalAction(quoteId);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Quote submitted for approval');
          router.refresh();
        }
      } catch {
        toast.error('An unexpected error occurred. Please try again.');
      }
    });
  }

  function handleApprove() {
    startTransition(async () => {
      try {
        const res = await approveQuoteAction(quoteId);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Quote approved');
          router.refresh();
        }
      } catch {
        toast.error('An unexpected error occurred. Please try again.');
      }
    });
  }

  function handleSend() {
    startTransition(async () => {
      try {
        const res = await sendQuoteAction(quoteId);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Quote sent');
          router.refresh();
        }
      } catch {
        toast.error('An unexpected error occurred. Please try again.');
      }
    });
  }

  function handleAccept() {
    startTransition(async () => {
      try {
        const res = await acceptQuoteAction(quoteId);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Quote accepted');
          router.refresh();
        }
      } catch {
        toast.error('An unexpected error occurred. Please try again.');
      }
    });
  }

  function handleCreateRevision() {
    startTransition(async () => {
      try {
        const res = await createQuoteRevisionAction(quoteId);
        if (res?.error) {
          toast.error(res.error);
        } else {
          toast.success('Quote revision created');
          router.push(`/quotes/${res.data.id}`);
        }
      } catch {
        toast.error('An unexpected error occurred. Please try again.');
      }
    });
  }

  return (
    <div className="space-y-3">
      {status === 'DRAFT' && isOwner && (
        <Button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full bg-amber-500 hover:bg-amber-600 text-white"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit for Approval
        </Button>
      )}

      {status === 'PENDING_APPROVAL' && isApprover && (
        <Button
          onClick={handleApprove}
          disabled={isPending}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Approve Quote
        </Button>
      )}

      {status === 'APPROVED' && isOwner && (
        <Button
          onClick={handleSend}
          disabled={isPending}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Send Quote
        </Button>
      )}

      {status === 'SENT' && isOwner && (
        <Button
          onClick={handleAccept}
          disabled={isPending}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept Quote
        </Button>
      )}

      {status !== 'ACCEPTED' && isOwner && (
        <Button
          onClick={handleCreateRevision}
          disabled={isPending}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white"
        >
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create Revision
        </Button>
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
