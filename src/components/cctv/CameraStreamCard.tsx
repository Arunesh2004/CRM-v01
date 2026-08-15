'use client';

import { useState } from 'react';
import { simulateAIEventAction } from '@/modules/cctv/actions/camera.actions';
import { useRouter } from 'next/navigation';
import { Video } from 'lucide-react';

export function CameraStreamCard({ camera }: { camera: any }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const router = useRouter();

  async function handleSimulateEvent() {
    setIsSimulating(true);
    const events = ['Person detected', 'Vehicle detected', 'Motion detected', 'Restricted area intrusion'];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    const confidence = Math.random() * (0.99 - 0.75) + 0.75; // 75% to 99%

    await simulateAIEventAction({
      cameraId: camera.id,
      detectedObject: randomEvent,
      confidence,
    });

    let severity = 'LOW';
    if (randomEvent.toLowerCase().includes('person')) severity = 'HIGH';
    else if (randomEvent.toLowerCase().includes('vehicle')) severity = 'MEDIUM';
    else if (randomEvent.toLowerCase().includes('restricted') || randomEvent.toLowerCase().includes('intrusion')) severity = 'CRITICAL';

    setIsSimulating(false);
    alert(`AI Event Created \n↓\nSecurity Incident Generated:\n${randomEvent} [${severity}]`);
    router.refresh();
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden flex flex-col group border-l-4 border-l-transparent hover:border-l-emerald-500 transition-all duration-300">
      {/* Video Placeholder (Mock Stream) */}
      <div className="bg-[#0f1423] aspect-video flex items-center justify-center relative overflow-hidden">
        {camera.status === 'ONLINE' ? (
          <div className="text-amber-500/80 text-center border border-amber-500/30 p-4 bg-amber-500/10 rounded-lg backdrop-blur-sm z-10">
            <div className="text-sm font-display font-bold tracking-widest mb-1 uppercase">SIMULATED STREAM</div>
            <div className="text-xs font-semibold tracking-widest uppercase opacity-80">DEMO DATA ONLY</div>
          </div>
        ) : (
          <div className="text-rose-500 font-display font-bold tracking-widest uppercase z-10 flex flex-col items-center">
            <Video className="w-8 h-8 mb-2 opacity-50" />
            CAMERA OFFLINE
          </div>
        )}
        
        {camera.status === 'ONLINE' && (
          <>
            {/* Fake scanning animation for demo effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/5 to-transparent h-[20%] w-full animate-[scan_3s_ease-in-out_infinite]" />
            <div className="absolute top-3 right-3 bg-rose-500/20 border border-rose-500/50 text-rose-500 text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full flex items-center shadow-[0_0_10px_rgba(244,63,94,0.5)]">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5 animate-pulse"></span>
              LIVE
            </div>
            <div className="absolute bottom-3 left-3 font-mono text-[10px] text-white/50 tracking-wider">
              {new Date().toISOString().split('T')[1].substring(0,8)} • CH-0{Math.floor(Math.random()*9)+1}
            </div>
          </>
        )}
      </div>
      
      {/* Camera Details & Actions */}
      <div className="p-4 border-t border-white/[.04] bg-white/[.01] flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-display font-bold text-white text-lg group-hover:text-emerald-400 transition-colors">{camera.name}</h3>
          <p className="text-[#8891B0] text-xs font-semibold uppercase tracking-wider mb-2">{camera.location?.name || 'Unassigned Location'}</p>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={handleSimulateEvent}
            disabled={camera.status !== 'ONLINE' || isSimulating}
            className="w-full bg-white/5 hover:bg-emerald-500/20 text-white hover:text-emerald-400 border border-white/[.08] hover:border-emerald-500/30 py-2 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:hover:bg-white/5 disabled:hover:text-white disabled:hover:border-white/[.08]"
          >
            {isSimulating ? 'Generating Event...' : 'Simulate AI Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
