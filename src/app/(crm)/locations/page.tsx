import { Suspense } from 'react';
import { getLocationsAction } from '@/modules/crm/actions/location.actions';

export default async function LocationsPage() {
  const result = await getLocationsAction();
  const locations = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-[#7C5CFC]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-white tracking-tight">Locations</h1>
            <p className="text-sm text-[#8891B0] mt-1">Manage physical sites and associated infrastructure.</p>
          </div>
        </div>
      </div>
      
      <div className="glass-panel overflow-hidden">
        <div className="p-4 border-b border-white/[.04]">
          <input 
            type="text" 
            placeholder="Search locations..." 
            className="w-full max-w-md text-sm transition-all placeholder:text-[#8891B0] focus:ring-2 focus:ring-[#7C5CFC] focus:border-transparent"
            style={{
              background: 'rgba(20,27,51,.55)',
              border: '1px solid rgba(255,255,255,.08)',
              borderRadius: '.7rem',
              padding: '.6rem 1rem',
              color: '#E7EAF5',
              outline: 'none',
            }}
          />
        </div>
        <Suspense fallback={<div className="p-8 text-center text-[#8891B0]">Loading location list...</div>}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[.08] text-xs font-medium text-[#8891B0] uppercase tracking-wider" style={{ background: 'rgba(20,27,51,.3)' }}>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">City</th>
                  <th className="px-6 py-4">Cameras</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.04]">
                {locations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-[#8891B0]">
                      No locations found. Click "Add Location" to get started.
                    </td>
                  </tr>
                )}
                {locations.map((location: any) => (
                  <tr key={location.id} className="hover:bg-white/[.02] transition-colors text-sm">
                    <td className="px-6 py-4 font-medium text-white">{location.name}</td>
                    <td className="px-6 py-4 text-[#8891B0]">{location.customer?.name || '-'}</td>
                    <td className="px-6 py-4 text-[#8891B0]">{location.city || '-'}</td>
                    <td className="px-6 py-4 text-[#8891B0]">0</td> {/* Future CCTV placeholder */}
                    <td className="px-6 py-4 text-right">
                      <button className="text-violet-400 hover:text-white transition-colors font-medium text-xs bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-lg">View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Suspense>
      </div>
    </div>
  );
}
