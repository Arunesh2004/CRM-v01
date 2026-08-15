import { Suspense } from 'react';
import { getCamerasAction } from '@/modules/cctv/actions/camera.actions';
import { CameraStreamCard } from '@/components/cctv/CameraStreamCard';

export default async function MonitoringDashboard() {
  const result = await getCamerasAction();
  const cameras = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">CCTV Monitoring Dashboard</h1>
          <p className="text-[#8891B0] mt-2">Live surveillance streams and incident detection</p>
        </div>
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 px-4 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest shadow-[0_0_15px_rgba(244,63,94,0.2)]">
          <span className="inline-block w-2 h-2 rounded-full bg-rose-500 mr-2 animate-pulse"></span>
          DEMO MODE ACTIVE
        </div>
      </div>
      
      {cameras.length === 0 ? (
        <div className="glass-panel p-16 text-center rounded-xl border border-white/[.08] shadow-2xl flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-white/5 border border-white/[.08] flex items-center justify-center mb-6">
            <svg className="w-10 h-10 text-[#8891B0] opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-display font-bold text-white mb-2">No cameras available</h3>
          <p className="text-[#8891B0] max-w-md mx-auto">You need to add cameras in the Camera Management module before you can monitor them here.</p>
        </div>
      ) : (
        <Suspense fallback={<div className="p-8 text-center text-[#8891B0] animate-pulse">Loading cameras...</div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {cameras.map((camera: any) => (
              <CameraStreamCard key={camera.id} camera={camera} />
            ))}
          </div>
        </Suspense>
      )}
    </div>
  );
}
