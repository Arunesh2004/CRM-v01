import { Suspense } from 'react';
import { getCamerasAction } from '@/modules/cctv/actions/camera.actions';
import { CameraForm } from '@/components/cctv/CameraForm';

export default async function CamerasPage() {
  const result = await getCamerasAction();
  const cameras = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Cameras</h1>
          <p className="text-[#8891B0] mt-2">Manage surveillance endpoints and protocols</p>
        </div>
        <CameraForm />
      </div>
      
      <div className="glass-panel rounded-xl overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/[.08] bg-white/[.02] flex justify-between items-center">
          <input 
            type="text" 
            placeholder="Search cameras..." 
            className="bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20 text-sm w-full max-w-md" 
          />
        </div>
        <div className="overflow-x-auto">
          <Suspense fallback={<div className="p-8 text-center text-[#8891B0] animate-pulse">Loading camera list...</div>}>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[.08] bg-white/[.02]">
                  <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Name</th>
                  <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Location</th>
                  <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">IP Address</th>
                  <th className="p-4 text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Protocol</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[.04]">
                {cameras.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#8891B0]">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        <p>No cameras found.</p>
                      </div>
                    </td>
                  </tr>
                )}
                {cameras.map((camera: any) => (
                  <tr key={camera.id} className="hover:bg-white/[.02] transition-colors group">
                    <td className="p-4 font-medium text-white group-hover:text-violet-400 transition-colors">{camera.name}</td>
                    <td className="p-4 text-[#8891B0] text-sm">{camera.location?.name || 'Unassigned'}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${camera.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                        {camera.status}
                      </span>
                    </td>
                    <td className="p-4 text-[#8891B0] text-sm font-mono">{camera.ipAddress}</td>
                    <td className="p-4 text-[#8891B0] text-sm font-mono">{camera.protocol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
