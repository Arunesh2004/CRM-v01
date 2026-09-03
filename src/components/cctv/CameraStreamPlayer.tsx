'use client';

import React, { useEffect, useRef } from 'react';
import { useMediaMTXWebRTC, WebRTCErrorType } from '@/hooks/useMediaMTXWebRTC';
import { Loader2, WifiOff, AlertTriangle, RefreshCw, PlayCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CameraStreamPlayerProps {
  cameraId: string;
  autoPlay?: boolean;
  muted?: boolean;
  className?: string;
}

const getErrorMessage = (errorType: WebRTCErrorType) => {
  switch (errorType) {
    case 'AUTH_ERROR':
      return 'Authentication failed. Please refresh the page.';
    case 'CAMERA_OFFLINE':
      return 'Camera is currently offline.';
    case 'NETWORK_ERROR':
      return 'Network connection lost.';
    case 'STREAM_UNAVAILABLE':
      return 'Stream is currently unavailable.';
    case 'NEGOTIATION_ERROR':
      return 'Failed to negotiate video stream.';
    case 'MISSING_CREDENTIALS':
      return 'Authentication required. Please configure camera credentials.';
    default:
      return 'An unknown error occurred.';
  }
};

export function CameraStreamPlayer({ 
  cameraId, 
  autoPlay = true, 
  muted = true, 
  className = '' 
}: CameraStreamPlayerProps) {
  const { status, errorType, stream, retry } = useMediaMTXWebRTC(cameraId);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (videoElement) {
      if (videoElement.srcObject !== stream) {
        videoElement.srcObject = stream;
      }
    }
  }, [stream]);

  const isLoading = status === 'loading' || status === 'idle';
  const isReconnecting = status === 'reconnecting';
  const isError = status === 'error';

  return (
    <div className={`relative w-full h-full bg-slate-950 overflow-hidden flex items-center justify-center rounded-md ${className}`}>
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        playsInline
        muted={muted}
        className={`w-full h-full object-contain transition-opacity duration-300 ${status === 'connected' ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white z-10">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
          <p className="text-sm font-medium animate-pulse">Connecting to stream...</p>
        </div>
      )}

      {/* Reconnecting Overlay */}
      {isReconnecting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white z-10">
          <RefreshCw className="w-8 h-8 animate-spin text-yellow-500 mb-4" />
          <p className="text-sm font-medium text-yellow-500">Reconnecting...</p>
        </div>
      )}

      {/* Error Overlay */}
      {isError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90 text-white z-20 p-4 text-center">
          {errorType === 'NETWORK_ERROR' || errorType === 'CAMERA_OFFLINE' ? (
            <WifiOff className="w-12 h-12 text-red-500 mb-4" />
          ) : (
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          )}
          <h3 className="text-lg font-semibold mb-2">Connection Failed</h3>
          <p className="text-sm text-slate-300 mb-6 max-w-sm">
            {getErrorMessage(errorType)}
          </p>
          {errorType !== 'MISSING_CREDENTIALS' && (
            <Button 
              onClick={retry} 
              variant="outline" 
              className="bg-transparent border-slate-600 hover:bg-slate-800 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      )}

      {/* Play Overlay (If autoplay is blocked or false, though mostly handled by browser UI if controls are added. For MVP, we stick to muted autoplay) */}
      {!autoPlay && status === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/30 transition-colors z-10 cursor-pointer">
          <PlayCircle className="w-16 h-16 text-white opacity-80 hover:opacity-100" />
        </div>
      )}
    </div>
  );
}
