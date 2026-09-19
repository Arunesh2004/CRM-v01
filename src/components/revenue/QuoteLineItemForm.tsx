'use client';

import { toast } from 'sonner';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { addQuoteLineItemAction } from '@/modules/revenue/actions/revenue.actions';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function QuoteLineItemForm({ 
  quoteId,
  priceBookEntries
}: { 
  quoteId: string;
  priceBookEntries: { 
    id: string; 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    unitPrice: any; 
    product: { name: string; sku?: string | null } 
  }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function action(formData: FormData) {
    const priceBookEntryId = formData.get('priceBookEntryId') as string;
    const quantity = parseInt(formData.get('quantity') as string, 10);
    const discount = parseFloat(formData.get('discount') as string);
    
    const res = await addQuoteLineItemAction({
      quoteId,
      priceBookEntryId,
      quantity,
      discount
    });
    
    if (res?.error) {
      toast.error(res.error);
    } else {
      toast.success('Line item added');
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="outline" className="mt-4 border-dashed border-white/20 text-[#8891B0] hover:text-white flex items-center gap-2">
        <Plus className="w-4 h-4" />
        Add Line Item
      </Button>
    );
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 relative">
      <button 
        onClick={() => setOpen(false)}
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
      >
        ✕
      </button>
      <h4 className="text-white font-medium mb-4">Add Line Item</h4>
      <form action={action} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-[#8891B0] mb-1">Product</label>
          <select 
            name="priceBookEntryId" 
            required
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm" 
          >
            <option value="" disabled selected>Select Product...</option>
            {priceBookEntries.map(pbe => (
              <option key={pbe.id} value={pbe.id}>
                {pbe.product.name} {pbe.product.sku ? `(${pbe.product.sku})` : ''} - ${Number(pbe.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8891B0] mb-1">Quantity</label>
          <input 
            type="number" 
            name="quantity" 
            defaultValue="1"
            min="1"
            required
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm" 
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-[#8891B0] mb-1">Discount (%)</label>
          <input 
            type="number" 
            name="discount" 
            defaultValue="0"
            min="0"
            max="100"
            step="0.01"
            required
            className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-white text-sm" 
          />
        </div>
        <div className="md:col-span-4 mt-2">
          <SubmitButton className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition-colors">
            Add to Quote
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
