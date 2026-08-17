import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getCamerasAction } from '@/modules/cctv/actions/camera.actions';
import { getCameraRecordingsAction } from '@/modules/cctv/actions/recording.actions';
import { generateStreamTokenAction as streamAction } from '@/modules/cctv/actions/stream.actions';
import { getAIEventsAction } from '@/modules/ai-events/actions/ai-event.actions';
import { Video, ShieldAlert, AlertCircle, PlayCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function CameraDetailPage({ params }: { params: { id: string } }) {
  // We can fetch data concurrently
  const [camerasResult, streamResult, eventsResult, recordingsResult] = await Promise.all([
    getCamerasAction(), // In reality we should have getCameraByIdAction exposed, for now filter locally if missing
    streamAction(params.id),
    getAIEventsAction({ cameraId: params.id, limit: 10 }),
    getCameraRecordingsAction(params.id, 5)
  ]);

  const camera = (camerasResult.data || []).find((c: any) => c.id === params.id);
  if (!camera) return notFound();

  const streamInfo = streamResult.success ? streamResult.data : null;
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
          <div className="glass-panel rounded-xl overflow-hidden shadow-2xl relative aspect-video bg-black flex items-center justify-center">
            {camera.status === 'ONLINE' && streamInfo ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-emerald-500/30">
                <Video className="w-12 h-12 text-emerald-400 mb-4 animate-pulse" />
                <h3 className="text-xl text-emerald-400 font-semibold mb-2">Secure Stream Connected</h3>
                <p className="text-[#8891B0] text-sm font-mono break-all max-w-md">
                  wss://stream.ai-security-crm.example.com/...
                </p>
                <div className="mt-4 px-3 py-1 bg-white/5 rounded text-xs text-[#8891B0]">
                  Token Expiry: {new Date(streamInfo.expiresAt).toLocaleTimeString()}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-2" />
                <p className="text-[#8891B0]">Camera is offline or stream is inaccessible.</p>
              </div>
            )}
          </div>
          
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-violet-400" /> Recent Recordings (DVR)
            </h3>
            {recordings.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {recordings.map((rec: any) => (
                  <div key={rec.id} className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer group">
                    <div className="aspect-video bg-black/40 rounded flex items-center justify-center mb-2">
                      <PlayCircle className="w-8 h-8 text-white/50 group-hover:text-violet-400 transition-colors" />
                    </div>
                    <p className="text-xs text-white font-medium">{new Date(rec.startTime).toLocaleTimeString()}</p>
                    <p className="text-[10px] text-[#8891B0]">{(rec.sizeBytes / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#8891B0]">No recent recordings available.</p>
            )}
          </div>
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
