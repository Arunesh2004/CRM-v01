'use client';
import { useState, useTransition } from 'react';
import { BookOpen, Edit2, Archive, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { createPriceBookAction, updatePriceBookAction, deactivatePriceBookAction } from '@/modules/revenue/actions/price-book.actions';
import { toast } from 'sonner';
import type { PriceBook } from '@prisma/client';

export function PriceBooksClient({ priceBooks, canManage }: { priceBooks: PriceBook[], canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', description: '', currencyCode: 'USD', isActive: true });

  const handleCreate = async () => {
    if (!formData.name) {
        toast.error('Name is required');
        return;
    }
    if (!formData.currencyCode || formData.currencyCode.length !== 3) {
        toast.error('Valid Currency Code is required (e.g., USD)');
        return;
    }
    startTransition(async () => {
      const result = await createPriceBookAction(formData);
      if (result.success) {
        toast.success('Price Book created');
        setIsAdding(false);
        setFormData({ name: '', description: '', currencyCode: 'USD', isActive: true });
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    startTransition(async () => {
      const result = await updatePriceBookAction(editingId, formData);
      if (result.success) {
        toast.success('Price Book updated');
        setEditingId(null);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this Price Book?')) return;
    startTransition(async () => {
      const result = await deactivatePriceBookAction(id);
      if (result.success) {
        toast.success('Price Book deactivated');
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
          <Button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', description: '', currencyCode: 'USD', isActive: true }); }} disabled={isPending}>
            <Plus className="w-4 h-4 mr-2" /> Add Price Book
          </Button>
        </div>
      )}

      {(isAdding || editingId) && canManage && (
        <div className="glass-panel p-4 mb-4 rounded-xl flex flex-col gap-4 border border-white/10 bg-white/5">
          <h3 className="font-semibold text-white">{editingId ? 'Edit Price Book' : 'New Price Book'}</h3>
          <input 
             type="text" 
             placeholder="Price Book Name" 
             value={formData.name}
             onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input 
             type="text" 
             placeholder="Description" 
             value={formData.description}
             onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input 
             type="text" 
             placeholder="Currency Code (e.g. USD)" 
             value={formData.currencyCode}
             maxLength={3}
             onChange={e => setFormData(prev => ({ ...prev, currencyCode: e.target.value.toUpperCase() }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm uppercase"
          />
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setIsAdding(false); setEditingId(null); }}>Cancel</Button>
            <Button onClick={editingId ? handleUpdate : handleCreate} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Price Book</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Currency</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
              {canManage && <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px] text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[.04]">
            {priceBooks?.map((pb) => (
              <tr key={pb.id} className="hover:bg-white/[.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                      <BookOpen className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{pb.name}</p>
                      <p className="text-xs text-[#8891B0] truncate max-w-[200px]">{pb.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#8891B0] font-mono text-xs">{pb.currencyCode}</td>
                <td className="px-6 py-4">
                  {pb.isActive ? (
                    <Badge variant="emerald">Active</Badge>
                  ) : (
                    <Badge variant="slate">Inactive</Badge>
                  )}
                </td>
                {canManage && (
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { 
                                setEditingId(pb.id); 
                                setIsAdding(false); 
                                setFormData({ name: pb.name, description: pb.description || '', currencyCode: pb.currencyCode, isActive: pb.isActive }); 
                            }}
                            disabled={isPending}
                        >
                            <Edit2 className="w-4 h-4 text-[#8891B0]" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeactivate(pb.id)}
                            disabled={isPending || !pb.isActive}
                            className={pb.isActive ? "hover:bg-red-500/10 text-red-400" : "opacity-50"}
                        >
                            <Archive className="w-4 h-4" />
                        </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(!priceBooks || priceBooks.length === 0) && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-6 py-8 text-center text-[#8891B0]">
                  No Price Books found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
