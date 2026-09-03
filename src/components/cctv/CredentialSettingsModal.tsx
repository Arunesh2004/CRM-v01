'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { setCameraCredentialsAction, clearCameraCredentialsAction } from '@/modules/cctv/actions/camera.actions';
import { Loader2, Key, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  cameraId: string;
  hasCredentials: boolean;
  isOpen: boolean;
  onClose: () => void;
}

export function CredentialSettingsModal({ cameraId, hasCredentials, isOpen, onClose }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const router = useRouter();

  if (!isOpen) return null;

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    const rtspUsername = formData.get('rtspUsername') as string;
    const rtspPassword = formData.get('rtspPassword') as string;

    const res = await setCameraCredentialsAction({ cameraId, rtspUsername, rtspPassword });
    
    setIsLoading(false);
    if (res.success) {
      onClose();
      router.refresh();
    } else {
      setError(res.error || 'Failed to update credentials');
    }
  }

  async function handleClear() {
    setIsLoading(true);
    setError('');

    const res = await clearCameraCredentialsAction({ cameraId });
    
    setIsLoading(false);
    if (res.success) {
      onClose();
      router.refresh();
    } else {
      setError(res.error || 'Failed to clear credentials');
    }
  }

  return (
    <div className="fixed inset-0 bg-[#06080F]/80 backdrop-blur-md flex items-center justify-center z-50 animate-in fade-in">
      <div className="glass-panel p-6 rounded-xl w-full max-w-md border border-white/[.08] shadow-2xl animate-in zoom-in-95">
        
        <div className="flex items-center mb-4 space-x-2">
          <Key className="w-5 h-5 text-violet-400" />
          <h2 className="text-xl font-display font-bold text-white">Camera Credentials</h2>
        </div>
        
        {hasCredentials && !isConfirmingClear && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center">
            <span className="font-semibold mr-2">✓ Credentials currently configured.</span> 
            Enter new ones below to rotate them.
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-sm font-medium mb-4 flex items-start">
            <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {isConfirmingClear ? (
          <div className="animate-in fade-in">
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Are you sure you want to clear these credentials? The camera will retain its authentication mode, but will not be able to stream until new credentials are provided.
            </p>
            <div className="flex justify-end space-x-3 pt-4 border-t border-white/[.04]">
              <button 
                type="button" 
                onClick={() => setIsConfirmingClear(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                onClick={handleClear}
                disabled={isLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Yes, Clear Credentials'}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">New RTSP Username *</label>
              <input required name="rtspUsername" type="text" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#8891B0] uppercase tracking-wider mb-1.5">New RTSP Password *</label>
              <input required name="rtspPassword" type="password" className="w-full bg-[#06080F]/50 border border-white/[.08] rounded-lg p-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20 text-sm" />
            </div>

            <div className="flex justify-between items-center pt-6 border-t border-white/[.04]">
              {hasCredentials ? (
                <button 
                  type="button" 
                  onClick={() => setIsConfirmingClear(true)}
                  className="text-sm text-rose-500 hover:text-rose-400 font-medium transition-colors"
                  disabled={isLoading}
                >
                  Clear credentials
                </button>
              ) : (
                <div />
              )}
              
              <div className="flex space-x-3">
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg text-sm font-semibold transition-colors"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
