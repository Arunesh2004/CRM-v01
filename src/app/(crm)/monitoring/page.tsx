import { Suspense } from 'react';
import { getCamerasAction } from '@/modules/cctv/actions/camera.actions';
import { CameraStreamCard } from '@/components/cctv/CameraStreamCard';

export default async function MonitoringDashboard() {
  const result = await getCamerasAction();
  const cameras = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">CCTV Monitoring Dashboard</h1>
        <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded font-semibold text-sm">
          DEMO MODE ACTIVE
        </div>
      </div>
      
      {cameras.length === 0 ? (
        <div className="bg-white rounded shadow p-12 text-center text-gray-500">
          <h3 className="text-lg font-bold mb-2">No cameras available</h3>
          <p>You need to add cameras in the Camera Management module before you can monitor them here.</p>
        </div>
      ) : (
        <Suspense fallback={<div>Loading cameras...</div>}>
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
