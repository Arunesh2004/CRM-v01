import { getTerritoriesAction } from '@/modules/sales-intelligence/actions/territory.actions';
import { Card } from '@/components/ui/Card';
import { MapPin } from 'lucide-react';
import { checkPermissionFast, getCurrentUser } from '@/lib/auth';
import { Resource, Action } from '@prisma/client';
import { TerritoriesClient } from './TerritoriesClient';

export default async function TerritoriesPage() {
  const result = await getTerritoriesAction();
  const territories = (result.success && result.data) ? result.data : [];

  const user = await getCurrentUser();
  let canManage = false;
  if (user) {
    canManage = await checkPermissionFast(user.id, Resource.SALES_INTEL, Action.MANAGE_TERRITORIES);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <MapPin className="w-5 h-5 text-cyan-400" /> Territories
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage geographical sales regions and assignments.</p>
        </div>
      </div>

      <Card className="glass-panel overflow-hidden border-none shadow-none">
        <TerritoriesClient territories={territories} canManage={canManage} />
      </Card>
    </div>
  );
}
