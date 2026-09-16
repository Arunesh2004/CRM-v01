'use client';

import React, { useState, useEffect } from 'react';
import { useWebRTCCall } from '@/hooks/useWebRTCCall';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface WebRTCCallManagerProps {
  userId: string;
  tenantId: string;
}

export default function WebRTCCallManager({ userId, tenantId }: WebRTCCallManagerProps) {
  const { callState, callId, remoteUserId, localVideoRef, remoteAudioRef, acceptCall, rejectCall, endCall, initiateCall } = useWebRTCCall({ userId, tenantId });
  const [showModal, setShowModal] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const isTerminalOrIdle = callState === 'IDLE' || callState === 'ENDED' || callState === 'FAILED' || callState === 'REJECTED' || callState === 'MISSED';
  const [prevCallState, setPrevCallState] = useState(callState);

  // Sync state during render (React recommended pattern for deriving state from props/hooks without effects)
  if (callState !== prevCallState) {
    setPrevCallState(callState);
    if (!isTerminalOrIdle) {
      setShowModal(true);
    }
  }

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    if (isTerminalOrIdle) {
      timeout = setTimeout(() => setShowModal(false), 2000); // Wait 2s to show terminal state before hiding
    }
    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [isTerminalOrIdle]);

  useEffect(() => {
    const handleInitiateCall = (e: Event) => {
      const customEvent = e as CustomEvent<{ targetUserId: string }>;
      if (customEvent.detail?.targetUserId) {
         
        initiateCall(customEvent.detail.targetUserId);
      }
    };
    window.addEventListener('webrtc-initiate-call', handleInitiateCall);
    return () => window.removeEventListener('webrtc-initiate-call', handleInitiateCall);
  }, [initiateCall]);

  const handleAccept = async () => {
    await acceptCall();
  };

  const handleReject = async () => {
    await rejectCall();
  };

  const handleEndCall = async () => {
    await endCall();
  };

  const toggleMute = () => {
    // MediaStream access should ideally be exposed by the hook, but for now we will disable mute logic
    // or we'd have to expose toggleMute from the hook. To preserve hook encapsulation and satisfy TS:
    console.warn("Mute requires hook extension");
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#0D1326] border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col">
        <div className="p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center mb-4 relative">
            <Phone className="w-8 h-8 text-indigo-400" />
            {callState === 'RINGING' && (
              <span className="absolute inset-0 rounded-full border-2 border-indigo-400 animate-ping opacity-75"></span>
            )}
          </div>
          <h3 className="text-xl font-display font-semibold text-white mb-1">
            {remoteUserId ? `User: ${remoteUserId.substring(0, 8)}` : 'Unknown Caller'}
          </h3>
          <p className="text-[#8891B0] text-sm mb-6">
            {callState === 'RINGING' ? 'Incoming Call...' :
             callState === 'CALLING' ? 'Calling...' :
             callState === 'CONNECTED' ? 'Call Connected' :
             callState === 'REJECTED' ? 'Call Rejected' :
             callState === 'ENDED' ? 'Call Ended' : callState}
          </p>

          <audio ref={remoteAudioRef} autoPlay />

          <div className="flex items-center justify-center gap-4 w-full">
            {callState === 'RINGING' && (
              <>
                <button 
                  onClick={handleReject}
                  className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
                <button 
                  onClick={handleAccept}
                  className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                >
                  <Phone className="w-5 h-5" />
                </button>
              </>
            )}

            {callState === 'CONNECTED' && (
              <>
                <button 
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-amber-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                >
                  {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button 
                  onClick={handleEndCall}
                  className="w-12 h-12 rounded-full bg-red-500 text-white hover:bg-red-600 flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                >
                  <PhoneOff className="w-5 h-5" />
                </button>
              </>
            )}

            {(callState === 'CALLING') && (
              <button 
                onClick={handleEndCall}
                className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
