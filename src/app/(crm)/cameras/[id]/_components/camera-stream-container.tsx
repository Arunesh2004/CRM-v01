'use client';

import { useState } from 'react';
import { CameraStreamPlayer } from '@/components/cctv/CameraStreamPlayer';
import { CredentialSettingsModal } from '@/components/cctv/CredentialSettingsModal';
import { Settings, Lock, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  cameraId: string;
  status: string;
  authMode: 'NONE' | 'PASSWORD';
  hasCredentials: boolean;
}

export function CameraStreamContainer({ cameraId, status, authMode, hasCredentials }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isOffline = status !== 'ONLINE';
  const needsCredentials = authMode === 'PASSWORD' && !hasCredentials;

  return (
    <div className="relative glass-panel rounded-xl overflow-hidden shadow-2xl bg-black flex flex-col h-full w-full aspect-video">
      
      {/* Header Overlay for settings */}
      {authMode === 'PASSWORD' && (
        <div className="absolute top-4 right-4 z-30">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="p-2 bg-black/50 hover:bg-black/70 backdrop-blur-sm rounded-full text-white/80 hover:text-white transition-colors border border-white/10"
            title="Manage Credentials"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 w-full h-full flex items-center justify-center relative">
        {isOffline ? (
          <div className="text-center p-6 z-20">
            <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto mb-2" />
            <p className="text-[#8891B0]">Camera is offline.</p>
          </div>
        ) : needsCredentials ? (
          <div className="text-center p-6 z-20 max-w-sm">
            <Lock className="w-12 h-12 text-yellow-500 mx-auto mb-4 opacity-80" />
            <h3 className="text-lg font-semibold text-white mb-2">Camera credentials required</h3>
            <p className="text-[#8891B0] text-sm mb-6">
              This camera requires RTSP authentication. Please add the credentials to start streaming.
            </p>
            <Button 
              onClick={() => setIsModalOpen(true)} 
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              Add Credentials
            </Button>
          </div>
        ) : (
          <CameraStreamPlayer cameraId={cameraId} className="absolute inset-0" />
        )}
      </div>

      <CredentialSettingsModal 
        cameraId={cameraId}
        hasCredentials={hasCredentials}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
