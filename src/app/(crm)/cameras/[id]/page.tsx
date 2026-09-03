import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCamerasAction } from '@/modules/cctv/actions/camera.actions';
import { getCameraRecordingsAction } from '@/modules/cctv/actions/recording.actions';
import { getAIEventsAction } from '@/modules/ai-events/actions/ai-event.actions';
import { Video, ShieldAlert, AlertCircle, PlayCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CameraStreamContainer } from './_components/camera-stream-container';
import { RecordingTimeline } from './_components/recording-timeline';

export default async function CameraDetailPage({ params }: { params: { id: string } }) {
  // We can fetch data concurrently
  const [camerasResult, eventsResult, recordingsResult] = await Promise.all([
    getCamerasAction(), // In reality we should have getCameraByIdAction exposed, for now filter locally if missing
    getAIEventsAction({ cameraId: params.id, limit: 10 }),
    getCameraRecordingsAction(params.id, 5)
  ]);

  const camera = (camerasResult.data || []).find((c: any) => c.id === params.id);
  if (!camera) return notFound();

  const events = eventsResult.success ? (eventsResult.data?.data || []) : [];
  const recordings = recordingsResult.success ? (recordingsResult.data?.data || []) : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/cameras" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to SOC Dashboard
        </Link>
      </div>

      <div className="flex justify-between items-end border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            {camera.name}
          </h1>
          <p className="text-[#8891B0] mt-1 font-mono text-sm">{camera.ipAddress} • {camera.protocol}</p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${
          camera.status === 'ONLINE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {camera.status}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Live Stream View */}
        <div className="lg:col-span-2 space-y-4">
          <div className="h-full relative">
            <CameraStreamContainer 
              cameraId={camera.id}
              status={camera.status}
              authMode={camera.authMode}
              hasCredentials={camera.hasCredentials}
            />
          </div>
          
          <RecordingTimeline recordings={recordings} />
        </div>

        {/* AI Events Timeline */}
        <div className="lg:col-span-1 space-y-4">
          <div className="glass-panel rounded-xl p-6 h-full min-h-[500px]">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-violet-400" /> AI Event Log
            </h3>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
              {events.map((event: any) => (
                <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-black shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-panel p-3 rounded-lg">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium text-white text-sm">{event.detectedObject}</span>
                    </div>
                    <p className="text-xs text-[#8891B0]">Conf: {(event.confidence * 100).toFixed(0)}%</p>
                    <span className="text-[10px] text-[#8891B0] block mt-2">{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="text-center text-[#8891B0] text-sm py-8 relative z-10">
                  No AI events recorded for this camera.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
