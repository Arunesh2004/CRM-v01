import { getTerritoriesAction } from '@/modules/sales-intelligence/actions/territory.actions';
import { Card } from '@/components/ui/Card';
import { MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function TerritoriesPage() {
  const result = await getTerritoriesAction();
  const territories = result.success ? result.data : [];

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
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[.04] bg-[#0D1326]/50">
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Territory Name</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Owner</th>
                <th className="px-6 py-4 font-semibold text-[#8891B0] uppercase tracking-wider text-[10px]">Geography</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[.04]">
              {territories?.map((territory: any) => (
                <tr key={territory.id} className="hover:bg-white/[.02] transition-colors group">
                  <td className="px-6 py-4">
                    <p className="font-medium text-white">{territory.name}</p>
                  </td>
                  <td className="px-6 py-4 text-[#8891B0]">{territory.owner?.email || 'Unassigned'}</td>
                  <td className="px-6 py-4 text-[#8891B0]">
                     {Array.isArray(territory.geographyData) ? territory.geographyData.join(', ') : '-'}
                  </td>
                </tr>
              ))}
              {(!territories || territories.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-[#8891B0]">
                    No territories found.
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
