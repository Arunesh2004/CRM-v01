import { getProductsAction } from '@/modules/revenue/actions/product.actions';
import { Card } from '@/components/ui/Card';
import { Package, Tag, Box } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function ProductsPage() {
  const result = await getProductsAction();
  const products = result.success ? result.data : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-violet-400" /> Products Catalog
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage security hardware and software offerings.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Product</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">SKU</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Family</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {products?.map((product: any) => (
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
                  <td className="px-6 py-4 text-[#8891B0]">{product.family || '-'}</td>
                  <td className="px-6 py-4">
                    {product.isActive ? (
                      <Badge variant="emerald">Active</Badge>
                    ) : (
                      <Badge variant="slate">Inactive</Badge>
                    )}
                  </td>
                </tr>
              ))}
              {(!products || products.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-[#8891B0]">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
