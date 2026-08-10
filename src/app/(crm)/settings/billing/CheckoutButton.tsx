'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createCheckoutSessionAction } from '@/modules/billing/actions/billing.actions';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export function CheckoutButton({ planId }: { planId: string }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    const res = await createCheckoutSessionAction(planId);
    if (res.success && res.url) {
      window.location.href = res.url;
    } else {
      toast.error(res.error || 'Failed to initialize checkout');
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleCheckout} disabled={loading} className="w-full">
      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
      {loading ? 'Redirecting...' : 'Upgrade Plan'}
    </Button>
  );
}
