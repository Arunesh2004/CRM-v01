import { getProductsAction } from '@/modules/revenue/actions/product.actions';
import { Card } from '@/components/ui/Card';
import { Package } from 'lucide-react';
import { checkPermissionFast, getCurrentUser } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';
import { ProductsClient } from './ProductsClient';

export default async function ProductsPage() {
  const result = await getProductsAction();
  const products = (result.success && result.data) ? result.data : [];
  
  const user = await getCurrentUser();
  let canManage = false;
  if (user) {
    canManage = await checkPermissionFast(user.id, Resource.PRODUCT, Action.CREATE);
  }

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
         <ProductsClient products={products} canManage={canManage} />
      </Card>
    </div>
  );
}
