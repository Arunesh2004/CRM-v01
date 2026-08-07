'use client';

import { useState } from 'react';
import { simulateAIEventAction } from '@/modules/cctv/actions/camera.actions';
import { useRouter } from 'next/navigation';

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
    <div className="bg-white rounded shadow flex flex-col overflow-hidden">
      {/* Video Placeholder (Mock Stream) */}
      <div className="bg-gray-800 aspect-video flex items-center justify-center relative">
        {camera.status === 'ONLINE' ? (
          <div className="text-amber-500 text-center border-4 border-amber-500 p-4 bg-black/80">
            <div className="text-2xl font-bold tracking-widest mb-1">SIMULATED STREAM</div>
            <div className="text-lg font-bold tracking-widest">DEMO DATA ONLY</div>
          </div>
        ) : (
          <div className="text-red-500 font-bold">CAMERA OFFLINE</div>
        )}
        
        {camera.status === 'ONLINE' && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded animate-pulse">
            LIVE
          </div>
        )}
      </div>
      
      {/* Camera Details & Actions */}
      <div className="p-4 border-t flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-lg">{camera.name}</h3>
          <p className="text-gray-500 text-sm mb-2">{camera.location?.name || 'Unassigned Location'}</p>
        </div>
        
        <div className="mt-4">
          <button 
            onClick={handleSimulateEvent}
            disabled={camera.status !== 'ONLINE' || isSimulating}
            className="w-full bg-blue-600 text-white py-2 rounded text-sm disabled:bg-gray-400 hover:bg-blue-700 transition"
          >
            {isSimulating ? 'Generating Event...' : 'Simulate AI Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
