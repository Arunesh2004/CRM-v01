import { Suspense } from 'react';
import { getCamerasAction } from '@/modules/cctv/actions/camera.actions';
import { CameraForm } from '@/components/cctv/CameraForm';

export default async function CamerasPage() {
  const result = await getCamerasAction();
  const cameras = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cameras</h1>
        <CameraForm />
      </div>
      
      <div className="bg-white rounded shadow p-4">
        <div className="mb-4 flex justify-between">
          <input type="text" placeholder="Search cameras..." className="border rounded p-2 w-full max-w-md" />
        </div>
        <Suspense fallback={<div>Loading camera list...</div>}>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Location</th>
                <th className="py-2">Status</th>
                <th className="py-2">IP Address</th>
                <th className="py-2">Protocol</th>
              </tr>
            </thead>
            <tbody>
              {cameras.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500">
                    No cameras found. Click "Add Camera" to get started.
                  </td>
                </tr>
              )}
              {cameras.map((camera: any) => (
                <tr key={camera.id} className="border-b">
                  <td className="py-2 font-medium">{camera.name}</td>
                  <td className="py-2">{camera.location?.name || 'Unassigned'}</td>
                  <td className="py-2">
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${camera.status === 'ONLINE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {camera.status}
                    </span>
                  </td>
                  <td className="py-2">{camera.ipAddress}</td>
                  <td className="py-2">{camera.protocol}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Suspense>
      </div>
    </div>
  );
}
