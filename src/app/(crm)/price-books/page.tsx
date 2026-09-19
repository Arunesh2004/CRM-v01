import { getPriceBooksAction } from '@/modules/revenue/actions/price-book.actions';
import { Card } from '@/components/ui/Card';
import { BookOpen } from 'lucide-react';
import { checkPermissionFast, getCurrentUser } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';
import { PriceBooksClient } from './PriceBooksClient';

export default async function PriceBooksPage() {
  const result = await getPriceBooksAction();
  const priceBooks = (result.success && result.data) ? result.data : [];
  
  const user = await getCurrentUser();
  let canManage = false;
  if (user) {
    canManage = await checkPermissionFast(user.id, Resource.REVENUE, Action.CREATE);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" /> Price Books
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage catalogs and pricing configuration.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
         <PriceBooksClient priceBooks={priceBooks} canManage={canManage} />
      </Card>
    </div>
  );
}
