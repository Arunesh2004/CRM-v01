'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { createQuoteAction } from '@/modules/revenue/actions/revenue.actions';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function QuoteForm({
  customers,
  deals,
  priceBooks
}: {
  customers: { id: string; name: string }[];
  deals: { id: string; title: string; customerId: string | null }[];
  priceBooks: { id: string; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const router = useRouter();

  async function action(formData: FormData) {
    // In a real app we would have dynamic line item picking,
    // for this minimal implementation we'll assume a dummy line item or no line items
    // unless the user selects them via a complex form.
    // However, the action requires lineItems. We will send an empty array or handle a simple item if we had PriceBookEntries.
    // For now we will just submit what is required and leave lineItems empty (if permitted) or hardcode a generic one.

    // Actually, createQuote requires `lineItemsInput`. Let's pass an empty array to allow saving a draft quote without items.
    // The service supports empty arrays for line items (subtotal = 0).
    const dealId = formData.get('dealId') as string;
    const customerId = formData.get('customerId') as string;
    const priceBookId = formData.get('priceBookId') as string;

    const res = await createQuoteAction({
      dealId,
      customerId,
      priceBookId,
      lineItems: []
    });

    if (res?.error) {
      setSubmitError(res.error);
      toast.error(res.error);
    } else {
      setSubmitError(null);
      toast.success('Quote created successfully');
      setOpen(false);
      if (res.data?.id) {
        router.push(`/quotes/${res.data.id}`);
      }
    }
  }

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCustomerId = e.target.value;
    setSelectedCustomerId(newCustomerId);
    setSubmitError(null);

    // If a deal was selected but it doesn't belong to this customer, clear it
    if (selectedDealId) {
      const dealBelongsToNewCustomer = deals.some(d => d.id === selectedDealId && d.customerId === newCustomerId);
      if (!dealBelongsToNewCustomer) {
        setSelectedDealId('');
      }
    }
  };

  const handleDealChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedDealId(e.target.value);
    setSubmitError(null);
  };

  const filteredDeals = selectedCustomerId
    ? deals.filter(d => d.customerId === selectedCustomerId)
    : deals;

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold rounded-xl shadow-lg flex items-center gap-2">
        <Plus className="w-4 h-4" />
        New Quote
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Create Quote
          </h2>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-500 dark:hover:text-slate-300"
          >
            ✕
          </button>
        </div>

        <form action={action} className="space-y-4">
          {submitError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm flex items-start gap-2">
              <span className="font-semibold text-rose-500">Error:</span> {submitError}
            </div>
          )}

          <div>
            <label htmlFor="customerId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer</label>
            <select
              id="customerId"
              name="customerId"
              required
              value={selectedCustomerId}
              onChange={handleCustomerChange}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
            >
              <option value="" disabled>Select Customer</option>
              {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="dealId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Deal</label>
            <select
              id="dealId"
              name="dealId"
              required
              value={selectedDealId}
              onChange={handleDealChange}
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
            >
              <option value="" disabled>Select Deal</option>
              {filteredDeals.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="priceBookId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Price Book</label>
            <select
              id="priceBookId"
              name="priceBookId"
              required
              className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100"
            >
              <option value="" disabled selected>Select Price Book</option>
              {priceBooks.map(pb => <option key={pb.id} value={pb.id}>{pb.name}</option>)}
            </select>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => {
              setOpen(false);
              setSubmitError(null);
            }}>
              Cancel
            </Button>
            <SubmitButton>Create Quote</SubmitButton>
          </div>
        </form>
      </div>
    </div>
  );
}
