import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getIncidentByIdAction } from '@/modules/incident/actions/incident.actions';
import { generateStreamTokenAction } from '@/modules/cctv/actions/stream.actions';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert, AlertTriangle, Video, MapPin, User, Activity } from 'lucide-react';

export default async function IncidentInvestigationPage({ params }: { params: { id: string } }) {
  const result = await getIncidentByIdAction(params.id);
  if (!result.success || !result.data) return notFound();

  const incident = result.data;

  // Pre-fetch a stream token if a camera is linked so investigators can see live view
  let streamUrl = null;
  if (incident.cameraId) {
    const streamRes = await generateStreamTokenAction(incident.cameraId);
    if (streamRes.success && streamRes.data) {
      streamUrl = streamRes.data.streamUrl;
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center gap-2 text-sm text-[#8891B0] mb-2">
        <Link href="/incidents" className="hover:text-white transition-colors flex items-center">
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Incidents
        </Link>
      </div>

      <div className="flex justify-between items-end border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-8 h-8 text-rose-500" />
            {incident.title}
          </h1>
          <p className="text-[#8891B0] mt-1 text-sm">{incident.description}</p>
        </div>
        <div className="flex gap-3 items-center">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-rose-500/10 text-rose-400 border-rose-500/20">
            {incident.severity}
          </span>
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border bg-white/10 text-white border-white/20">
            {incident.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Investigation Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-xl overflow-hidden shadow-2xl relative aspect-video bg-black flex items-center justify-center border border-rose-500/20">
            {streamUrl ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 bg-rose-500/5">
                <Video className="w-12 h-12 text-rose-400 mb-4 animate-pulse" />
                <h3 className="text-xl text-rose-400 font-semibold mb-2">Live Incident Feed</h3>
                <p className="text-[#8891B0] text-sm font-mono max-w-md break-all">
                  Connected: {streamUrl.substring(0, 40)}...
                </p>
                <Link href={`/cameras/${incident.cameraId}`} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded text-sm text-white transition-colors">
                  Open Full Camera View
                </Link>
              </div>
            ) : (
               <div className="text-center">
                <Video className="w-12 h-12 text-white/20 mx-auto mb-2" />
                <p className="text-[#8891B0]">No live stream available for this incident.</p>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="glass-panel p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-[#8891B0] uppercase mb-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> Location
              </h4>
              <p className="text-white font-medium">{incident.location?.name || 'Unknown'}</p>
              {incident.location?.address && <p className="text-xs text-[#8891B0] mt-1">{incident.location.address}</p>}
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <h4 className="text-sm font-semibold text-[#8891B0] uppercase mb-1 flex items-center gap-1">
                <User className="w-4 h-4" /> Assignee
              </h4>
              <p className="text-white font-medium">{incident.assignedUser?.email || 'Unassigned'}</p>
            </div>
          </div>
        </div>

        {/* Action Panel & AI Details */}
        <div className="lg:col-span-1 space-y-6">
          
          <div className="glass-panel rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
            <div className="space-y-3">
              <button className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-lg transition-colors text-sm">
                Acknowledge Incident
              </button>
              <button className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors text-sm">
                Start Investigation
              </button>
              <button className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-colors text-sm">
                Mark as Resolved
              </button>
              <button className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors text-sm">
                Close Ticket
              </button>
            </div>
          </div>

          {incident.aiEvent && (
            <div className="glass-panel rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-violet-400" /> Triggering AI Event
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-[#8891B0] uppercase font-semibold mb-1">Detected Object</p>
                  <p className="text-sm text-white font-medium">{incident.aiEvent.detectedObject}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8891B0] uppercase font-semibold mb-1">Confidence Score</p>
                  <p className="text-sm text-white font-medium">{(incident.aiEvent.confidence * 100).toFixed(2)}%</p>
                </div>
                <div>
                  <p className="text-xs text-[#8891B0] uppercase font-semibold mb-1">Timestamp</p>
                  <p className="text-sm text-white font-medium">{new Date(incident.aiEvent.timestamp).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-[#8891B0] uppercase font-semibold mb-1">AI Model</p>
                  <p className="text-sm text-white font-mono">{incident.aiEvent.model}</p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
