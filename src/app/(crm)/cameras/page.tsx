/* eslint-disable @typescript-eslint/no-explicit-any */
import { getCamerasAction } from '@/modules/cctv/actions/camera.actions';
import { getAIEventsAction } from '@/modules/ai-events/actions/ai-event.actions';
import Link from 'next/link';
import { Video, Activity, ShieldAlert } from 'lucide-react';
import { CameraStreamCard } from '@/components/cctv/CameraStreamCard';

export default async function CamerasSOCPage() {
  const [camerasResult, aiEventsResult] = await Promise.all([
    getCamerasAction(),
    getAIEventsAction({ limit: 5 })
  ]);

  const cameras = camerasResult.success ? (camerasResult.data || []) : [];
  const latestEvents = aiEventsResult.success ? (aiEventsResult.data?.data || []) : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  const onlineCameras = cameras.filter((c: any) => c.status === 'ONLINE').length;
  const offlineCameras = cameras.length - onlineCameras;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-violet-500" />
            Security Operations Center
          </h1>
          <p className="text-[#8891B0] mt-2">Live physical security monitoring and AI telemetry.</p>
        </div>
        <div className="flex gap-4">
          <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-sm font-medium text-white">{onlineCameras} Online</span>
          </div>
          <div className="glass-panel px-4 py-2 rounded-lg flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-rose-500"></div>
            <span className="text-sm font-medium text-white">{offlineCameras} Offline</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Camera Grid */}
        <div className="xl:col-span-3 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Video className="w-5 h-5 text-violet-400" /> Live Feeds
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameras.map((camera: any) => (
              <div key={camera.id} className="relative group">
                <Link href={`/cameras/${camera.id}`} className="absolute top-2 left-2 z-40 bg-black/50 hover:bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details
                </Link>
                <CameraStreamCard camera={camera} />
              </div>
            ))}
            {cameras.length === 0 && (
              <div className="col-span-3 p-12 text-center border border-dashed border-white/10 rounded-xl text-[#8891B0]">
                No cameras configured for this tenant.
              </div>
            )}
          </div>
        </div>

        {/* AI Events Telemetry */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-violet-400" /> Live AI Telemetry
          </h2>
          <div className="glass-panel rounded-xl p-4 space-y-4 h-[calc(100%-2.5rem)] overflow-y-auto">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing */}
            {latestEvents.map((event: any) => (
              <div key={event.id} className="border-l-2 border-violet-500 pl-3 py-1">
                <div className="flex justify-between items-start">
                  <span className="text-sm font-medium text-white">{event.detectedObject}</span>
                  <span className="text-xs text-[#8891B0]">{new Date(event.timestamp).toLocaleTimeString()}</span>
                </div>
                <div className="text-xs text-[#8891B0] mt-1 flex justify-between">
                  <span>{event.camera?.name}</span>
                  <span className="text-violet-400">{(event.confidence * 100).toFixed(0)}% conf</span>
                </div>
              </div>
            ))}
            {latestEvents.length === 0 && (
              <div className="text-center text-[#8891B0] text-sm py-8">
                No recent AI events.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
