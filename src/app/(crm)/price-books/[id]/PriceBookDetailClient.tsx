'use client';
import { useState, useTransition } from 'react';
import { Plus, Edit2, Archive, Play } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { createPriceBookEntryAction, updatePriceBookEntryAction } from '@/modules/revenue/actions/price-book-entry.actions';
import { toast } from 'sonner';
import type { PriceBook, PriceBookEntry, Product } from '@prisma/client';

type PriceBookEntryWithProduct = PriceBookEntry & { product: Product };

export function PriceBookDetailClient({ 
  priceBook, 
  entries, 
  products, 
  canManage 
}: { 
  priceBook: PriceBook, 
  entries: PriceBookEntryWithProduct[], 
  products: Product[],
  canManage: boolean 
}) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ productId: '', unitPrice: '' });
  const [editData, setEditData] = useState({ unitPrice: '' });

  const handleCreate = async () => {
    if (!formData.productId) {
        toast.error('Product is required');
        return;
    }
    if (!formData.unitPrice || !/^\d+(\.\d+)?$/.test(formData.unitPrice)) {
        toast.error('Valid unit price is required');
        return;
    }
    startTransition(async () => {
      const result = await createPriceBookEntryAction({
        priceBookId: priceBook.id,
        productId: formData.productId,
        unitPrice: formData.unitPrice,
        isActive: true,
      });
      if (result.success) {
        toast.success('PriceBookEntry created');
        setIsAdding(false);
        setFormData({ productId: '', unitPrice: '' });
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUpdatePrice = async () => {
    if (!editingId) return;
    if (!editData.unitPrice || !/^\d+(\.\d+)?$/.test(editData.unitPrice)) {
        toast.error('Valid unit price is required');
        return;
    }
    startTransition(async () => {
      const result = await updatePriceBookEntryAction(editingId, {
        unitPrice: editData.unitPrice,
      });
      if (result.success) {
        toast.success('Price updated');
        setEditingId(null);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    const actionName = currentActive ? 'deactivate' : 'reactivate';
    if (!confirm(`Are you sure you want to ${actionName} this entry?`)) return;
    
    startTransition(async () => {
      const result = await updatePriceBookEntryAction(id, {
        isActive: !currentActive,
      });
      if (result.success) {
        toast.success(`Entry ${actionName}d`);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ productId: '', unitPrice: '' }); }} disabled={isPending}>
            <Plus className="w-4 h-4 mr-2" /> Add Product Entry
          </Button>
        </div>
      )}

      {isAdding && canManage && (
        <div className="glass-panel p-4 mb-4 rounded-xl flex flex-col gap-4 border border-white/10 bg-white/5">
          <h3 className="font-semibold text-white">New PriceBook Entry</h3>
          <select 
             value={formData.productId}
             onChange={e => setFormData(prev => ({ ...prev, productId: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          >
             <option value="" disabled>Select Product</option>
             {products.map(p => (
                 <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
             ))}
          </select>
          <input 
             type="number" 
             step="0.01"
             min="0"
             placeholder={`Unit Price (${priceBook.currencyCode})`} 
             value={formData.unitPrice}
             onChange={e => setFormData(prev => ({ ...prev, unitPrice: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Product</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Unit Price</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
              {canManage && <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px] text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[.04]">
            {entries?.map((entry) => (
              <tr key={entry.id} className="hover:bg-white/[.02] transition-colors group">
                <td className="px-6 py-4">
                  <div>
                    <p className="font-medium text-white">{entry.product.name}</p>
                    <p className="text-xs text-[#8891B0]">SKU: {entry.product.sku}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-white font-mono text-sm">
                  {editingId === entry.id ? (
                      <div className="flex items-center gap-2">
                        <input 
                           type="number" 
                           step="0.01"
                           min="0"
                           value={editData.unitPrice}
                           onChange={e => setEditData({ unitPrice: e.target.value })}
                           className="w-24 bg-black/20 border border-white/10 rounded px-2 py-1 text-white text-sm"
                        />
                        <Button size="sm" onClick={handleUpdatePrice} disabled={isPending}>Save</Button>
                        <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                      </div>
                  ) : (
                      <span>{priceBook.currencyCode} {entry.unitPrice.toString()}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {entry.isActive ? (
                    <Badge variant="emerald">Active</Badge>
                  ) : (
                    <Badge variant="slate">Inactive</Badge>
                  )}
                </td>
                {canManage && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        {editingId !== entry.id && (
                          <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => { 
                                  setEditingId(entry.id); 
                                  setIsAdding(false); 
                                  setEditData({ unitPrice: entry.unitPrice.toString() }); 
                              }}
                              disabled={isPending || !entry.isActive}
                              title="Edit Price"
                          >
                              <Edit2 className="w-4 h-4 text-[#8891B0]" />
                          </Button>
                        )}
                        {entry.isActive ? (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleActive(entry.id, true)}
                                disabled={isPending}
                                className="hover:bg-red-500/10 text-red-400"
                                title="Deactivate"
                            >
                                <Archive className="w-4 h-4" />
                            </Button>
                        ) : (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleToggleActive(entry.id, false)}
                                disabled={isPending}
                                className="hover:bg-emerald-500/10 text-emerald-400"
                                title="Reactivate"
                            >
                                <Play className="w-4 h-4" />
                            </Button>
                        )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(!entries || entries.length === 0) && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-6 py-8 text-center text-[#8891B0]">
                  No products in this PriceBook yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
