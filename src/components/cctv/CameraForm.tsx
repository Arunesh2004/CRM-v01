'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createCameraAction } from '@/modules/cctv/actions/camera.actions';
import { getLocationsAction } from '@/modules/crm/actions/location.actions';
import { CameraProtocol } from '@prisma/client';

export function CameraForm() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [locations, setLocations] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      getLocationsAction().then((res) => {
        if (res.success) setLocations(res.data || []);
      });
    }
  }, [isOpen]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      locationId: formData.get('locationId') as string,
      ipAddress: formData.get('ipAddress') as string,
      protocol: formData.get('protocol') as CameraProtocol,
      model: formData.get('model') as string,
      manufacturer: formData.get('manufacturer') as string,
    };

    const res = await createCameraAction(data);
    
    setIsLoading(false);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to create camera');
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Camera
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md text-black">
            <h2 className="text-xl font-bold mb-4">Add New Camera</h2>
            
            {error && <div className="bg-red-100 text-red-600 p-2 rounded mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block font-semibold mb-1">Camera Name *</label>
                <input required name="name" type="text" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Location *</label>
                <select required name="locationId" className="w-full border rounded p-2">
                  <option value="">Select a location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">IP Address *</label>
                <input required name="ipAddress" type="text" placeholder="192.168.1.100" className="w-full border rounded p-2" />
              </div>
              <div>
                <label className="block font-semibold mb-1">Protocol *</label>
                <select required name="protocol" className="w-full border rounded p-2">
                  <option value="RTSP">RTSP</option>
                  <option value="ONVIF">ONVIF</option>
                  <option value="WEBRTC">WebRTC</option>
                  <option value="HLS">HLS</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Manufacturer</label>
                  <input name="manufacturer" type="text" className="w-full border rounded p-2" />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Model</label>
                  <input name="model" type="text" className="w-full border rounded p-2" />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-gray-200 rounded"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-blue-400"
                >
                  {isLoading ? 'Saving...' : 'Save Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
