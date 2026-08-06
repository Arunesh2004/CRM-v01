'use client';

import { useState } from 'react';
import { simulateAIEventAction } from '@/modules/cctv/actions/camera.actions';
import { useRouter } from 'next/navigation';

export function CameraStreamCard({ camera }: { camera: any }) {
  const [isSimulating, setIsSimulating] = useState(false);
  const router = useRouter();

  async function handleSimulateEvent() {
    setIsSimulating(true);
    const events = ['Person detected', 'Vehicle detected', 'Motion detected', 'Loitering detected'];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    const confidence = Math.random() * (0.99 - 0.75) + 0.75; // 75% to 99%

    await simulateAIEventAction({
      cameraId: camera.id,
      detectedObject: randomEvent,
      confidence,
    });

    setIsSimulating(false);
    alert(`Simulated AI Event: ${randomEvent}`);
    router.refresh();
  }

  return (
    <div className="bg-white rounded shadow flex flex-col overflow-hidden">
      {/* Video Placeholder (Mock Stream) */}
      <div className="bg-gray-800 aspect-video flex items-center justify-center relative">
        {camera.status === 'ONLINE' ? (
          <div className="text-gray-400 text-center">
            <div className="text-xl font-bold mb-2">[ DEMO LIVE STREAM ]</div>
            <div className="text-sm">RTSP Stream connection simulated</div>
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
