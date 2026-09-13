'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Pusher, { Channel } from 'pusher-js';

// Server actions
import {
  initiateCallAction,
  acceptCallAction,
  rejectCallAction,
  markConnectedAction,
  endCallAction
} from '@/modules/communication/actions/call.actions';

export type CallState = 'IDLE' | 'RINGING' | 'CALLING' | 'CONNECTED' | 'ENDED' | 'FAILED' | 'EXPIRED' | 'REJECTED' | 'MISSED';

interface UseWebRTCCallOptions {
  userId: string;
  tenantId: string;
  // Fallback STUN/TURN if backend config is unavailable
  iceServers?: RTCIceServer[];
}

// Default development STUN server. Production TURN must be provided by configuration.
const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' }
];

export function useWebRTCCall({ userId, tenantId, iceServers = DEFAULT_ICE_SERVERS }: UseWebRTCCallOptions) {
  const [callState, setCallState] = useState<CallState>('IDLE');
  const [callId, setCallId] = useState<string | null>(null);
  const [remoteUserId, setRemoteUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const channelRef = useRef<Channel | null>(null);
  const callVersionRef = useRef<number>(0);

  // We use refs for state that the handlers need so we don't have to recreate them
  const stateRef = useRef({ callId, callState });
  useEffect(() => {
    stateRef.current = { callId, callState };
  }, [callId, callState]);

  const sendSignal = useCallback(async (targetCallId: string, type: 'offer' | 'answer' | 'candidate', payload: unknown) => {
    if (!targetCallId) return;
    try {
      const res = await fetch('/api/communication/call/signaling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callId: targetCallId, type, payload })
      });
      if (!res.ok) {
        throw new Error(`Signaling failed: ${res.statusText}`);
      }
    } catch (err: unknown) {
      console.error('Failed to send signal:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  // Signal handlers
  const handleOffer = useCallback(async (data: { callId: string; payload: unknown }) => {
    if (data.callId !== stateRef.current.callId) return; // Ignore stale or unrelated calls
    try {
      const pc = pcRef.current;
      if (!pc) throw new Error('PeerConnection not initialized');

      await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await sendSignal(data.callId, 'answer', answer);
    } catch (err) {
      console.error('Failed to handle offer:', err);
    }
  }, [sendSignal]);

  const handleAnswer = useCallback(async (data: { callId: string; payload: unknown }) => {
    if (data.callId !== stateRef.current.callId) return;
    try {
      const pc = pcRef.current;
      if (!pc) throw new Error('PeerConnection not initialized');

      await pc.setRemoteDescription(new RTCSessionDescription(data.payload as RTCSessionDescriptionInit));
    } catch (err) {
      console.error('Failed to handle answer:', err);
    }
  }, []);

  const handleCandidate = useCallback(async (data: { callId: string; payload: unknown }) => {
    if (data.callId !== stateRef.current.callId) return;
    try {
      const pc = pcRef.current;
      if (!pc) return; // Might happen if candidate arrives very late

      await pc.addIceCandidate(new RTCIceCandidate(data.payload as RTCIceCandidateInit));
    } catch (err) {
      console.error('Failed to handle candidate:', err);
    }
  }, []);

  // Initialize Pusher explicitly once
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_PUSHER_KEY) {
      console.warn('NEXT_PUBLIC_PUSHER_KEY is missing. Realtime signaling is unavailable.');
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Expected error handling for missing config
      setError('REALTIME_PROVIDER_NOT_CONFIGURED');
      return;
    }

    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      authEndpoint: '/api/realtime/auth',
    });
    pusherRef.current = pusher;

    const channelName = `private-tenant_${tenantId}_user_${userId}`;
    const channel = pusher.subscribe(channelName);
    channelRef.current = channel;

    // Incoming Call listener
    channel.bind('incoming-call', (data: { callId: string; callerId: string }) => {
      // Ignore if we are already in a call
      if (stateRef.current.callState !== 'IDLE') return;

      setCallId(data.callId);
      setRemoteUserId(data.callerId);
      setCallState('RINGING');
      callVersionRef.current = 0; // Initialize version
    });

    // Signaling listener
    channel.bind('webrtc-offer', handleOffer);
    channel.bind('webrtc-answer', handleAnswer);
    channel.bind('webrtc-candidate', handleCandidate);

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [userId, tenantId, handleOffer, handleAnswer, handleCandidate]);

  // Clean up WebRTC resources entirely
  const cleanup = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        localStreamRef.current?.removeTrack(track);
      });
      localStreamRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
  }, []);

  const endCall = useCallback(async () => {
    const currentCallId = stateRef.current.callId;
    if (!currentCallId) return;
    try {
      const st = stateRef.current.callState;
      if (st === 'RINGING' || st === 'CALLING' || st === 'CONNECTED') {
         const res = await endCallAction(currentCallId, callVersionRef.current);
         if (res.success) {
           callVersionRef.current += 1;
         }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCallState('ENDED');
      cleanup();
      setCallId(null);
      setRemoteUserId(null);
    }
  }, [cleanup]);

  const getMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      return stream;
    } catch (err: unknown) {
      console.error('Microphone access denied or unavailable', err);
      setError('Microphone access denied or unavailable');
      throw err;
    }
  };

  const createPeerConnection = useCallback((stream: MediaStream) => {
    const pc = new RTCPeerConnection({ iceServers });

    // Add local tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && stateRef.current.callId) {
        sendSignal(stateRef.current.callId, 'candidate', event.candidate).catch(console.error);
      }
    };

    // Handle remote tracks
    pc.ontrack = (event) => {
      if (remoteAudioRef.current && event.streams[0]) {
        remoteAudioRef.current.srcObject = event.streams[0];
      }
    };

    // Handle connection state changes
    pc.oniceconnectionstatechange = async () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        if (stateRef.current.callState !== 'CONNECTED' && stateRef.current.callId) {
          setCallState('CONNECTED');
          try {
             // Let the server know we successfully connected
             const res = await markConnectedAction(stateRef.current.callId, callVersionRef.current);
             if (res.success) {
               callVersionRef.current += 1;
             }
          } catch (e) {
            console.error('Failed to mark call connected', e);
          }
        }
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setError('Peer connection failed');
        endCall().catch(console.error);
      }
    };

    pcRef.current = pc;
    return pc;
  }, [iceServers, sendSignal, endCall]);

  const initiateCall = async (targetUserId: string) => {
    try {
      setCallState('CALLING');
      setRemoteUserId(targetUserId);

      // 1. Authoritative server action
      const res = await initiateCallAction(targetUserId);
      if (!res.success || !res.data) {
        throw new Error((typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Failed to initiate call');
      }
      
      const session = res.data;
      setCallId(session.id);
      callVersionRef.current = 0;

      // 2. Get media and create PC
      const stream = await getMedia();
      const pc = createPeerConnection(stream);

      // 3. Create offer and send
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await sendSignal(session.id, 'offer', offer);
      
    } catch (err: unknown) {
      setCallState('FAILED');
      setError(err instanceof Error ? err.message : String(err));
      cleanup();
    }
  };

  const acceptCall = async () => {
    if (!stateRef.current.callId) return;
    try {
      // 1. Authoritative server action
      const res = await acceptCallAction(stateRef.current.callId, callVersionRef.current);
      if (!res.success) {
        throw new Error((typeof res.error === 'string' ? res.error : (res.error as any)?.message) || 'Failed to accept call');
      }
      callVersionRef.current += 1;

      // 2. Get media and create PC
      const stream = await getMedia();
      createPeerConnection(stream);
      // Wait for offer...

    } catch (err: unknown) {
      setCallState('FAILED');
      setError(err instanceof Error ? err.message : String(err));
      cleanup();
    }
  };

  const rejectCall = async () => {
    if (!stateRef.current.callId) return;
    try {
      const res = await rejectCallAction(stateRef.current.callId, callVersionRef.current);
      if (res.success) {
        callVersionRef.current += 1;
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCallState('REJECTED');
      cleanup();
      setCallId(null);
      setRemoteUserId(null);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    callState,
    callId,
    remoteUserId,
    error,
    localVideoRef,
    remoteAudioRef,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall
  };
}
