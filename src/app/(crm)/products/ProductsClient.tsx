'use client';
import { useState, useTransition } from 'react';
import { Box, Edit2, Archive, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { createProductAction, updateProductAction, deactivateProductAction } from '@/modules/revenue/actions/product.actions';
import { toast } from 'sonner';
import type { Product } from '@prisma/client';
export function ProductsClient({ products, canManage }: { products: Product[], canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ name: '', sku: '', description: '', isActive: true });

  const handleCreate = async () => {
    if (!formData.name || !formData.sku) {
        toast.error('Name and SKU are required');
        return;
    }
    startTransition(async () => {
      const result = await createProductAction(formData);
      if (result.success) {
        toast.success('Product created');
        setIsAdding(false);
        setFormData({ name: '', sku: '', description: '', isActive: true });
        // Typically window.location.reload() or router.refresh() handles the revalidation in a simple app
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    startTransition(async () => {
      const result = await updateProductAction(editingId, formData);
      if (result.success) {
        toast.success('Product updated');
        setEditingId(null);
        window.location.reload();
      } else {
        toast.error(result.error);
      }
    });
  };

  const handleDeactivate = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this product?')) return;
    startTransition(async () => {
      const result = await deactivateProductAction(id);
      if (result.success) {
        toast.success('Product deactivated');
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
          <Button onClick={() => { setIsAdding(true); setEditingId(null); setFormData({ name: '', sku: '', description: '', isActive: true }); }} disabled={isPending}>
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      )}

      {(isAdding || editingId) && canManage && (
        <div className="glass-panel p-4 mb-4 rounded-xl flex flex-col gap-4 border border-white/10 bg-white/5">
          <h3 className="font-semibold text-white">{editingId ? 'Edit Product' : 'New Product'}</h3>
          <input 
             type="text" 
             placeholder="Product Name" 
             value={formData.name}
             onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input 
             type="text" 
             placeholder="SKU" 
             value={formData.sku}
             onChange={e => setFormData(prev => ({ ...prev, sku: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
          />
          <input 
             type="text" 
             placeholder="Description" 
             value={formData.description}
             onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
             className="w-full bg-black/20 border border-white/10 rounded px-3 py-2 text-white text-sm"
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
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Product</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">SKU</th>
              <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
              {canManage && <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px] text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[.04]">
            {products?.map((product) => (
              <tr key={product.id} className="hover:bg-white/[.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-[#7C5CFC]/10 border border-[#7C5CFC]/20 flex items-center justify-center shrink-0">
                      <Box className="w-4 h-4 text-violet-400" />
                    </div>
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-xs text-[#8891B0] truncate max-w-[200px]">{product.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 text-[#8891B0] font-mono text-xs">{product.sku}</td>
                <td className="px-6 py-4">
                  {product.isActive ? (
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
                                setEditingId(product.id); 
                                setIsAdding(false); 
                                setFormData({ name: product.name, sku: product.sku, description: product.description || '', isActive: product.isActive }); 
                            }}
                            disabled={isPending}
                        >
                            <Edit2 className="w-4 h-4 text-[#8891B0]" />
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeactivate(product.id)}
                            disabled={isPending || !product.isActive}
                            className={product.isActive ? "hover:bg-red-500/10 text-red-400" : "opacity-50"}
                        >
                            <Archive className="w-4 h-4" />
                        </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={canManage ? 4 : 3} className="px-6 py-8 text-center text-[#8891B0]">
                  No products found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
