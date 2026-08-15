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
        className="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-[0_0_15px_rgba(124,92,252,0.3)]"
      >
        Add Camera
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in">
          <div className="glass-panel p-6 rounded-xl w-full max-w-md border border-white/[.08] shadow-2xl animate-in zoom-in-95">
            <h2 className="text-xl font-display font-bold mb-4 text-white">Add New Camera</h2>
            
            {error && <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm font-medium mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">Camera Name *</label>
                <input required name="name" type="text" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">Location *</label>
                <div className="relative">
                  <select required name="locationId" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all text-sm appearance-none cursor-pointer">
                    <option value="" className="bg-[#0f172a]">Select a location...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id} className="bg-[#0f172a]">{loc.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">IP Address *</label>
                <input required name="ipAddress" type="text" placeholder="192.168.1.100" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">Protocol *</label>
                <div className="relative">
                  <select required name="protocol" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all text-sm appearance-none cursor-pointer">
                    <option value="RTSP" className="bg-[#0f172a]">RTSP</option>
                    <option value="ONVIF" className="bg-[#0f172a]">ONVIF</option>
                    <option value="WEBRTC" className="bg-[#0f172a]">WebRTC</option>
                    <option value="HLS" className="bg-[#0f172a]">HLS</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">Manufacturer</label>
                  <input name="manufacturer" type="text" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">Model</label>
                  <input name="model" type="text" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20 text-sm" />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-white/[.04]">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
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
