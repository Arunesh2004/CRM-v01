import { useState, useEffect, useRef, useCallback } from 'react';

export type WebRTCErrorType = 
  | 'AUTH_ERROR' 
  | 'CAMERA_OFFLINE' 
  | 'NETWORK_ERROR' 
  | 'STREAM_UNAVAILABLE' 
  | 'NEGOTIATION_ERROR'
  | 'MISSING_CREDENTIALS'
  | null;

export interface WebRTCState {
  status: 'idle' | 'loading' | 'connected' | 'reconnecting' | 'error';
  errorType: WebRTCErrorType;
  stream: MediaStream | null;
}

const INITIAL_BACKOFF = 1000;
const MAX_BACKOFF = 15000;
const MAX_RETRIES = 5;
const ICE_GATHERING_TIMEOUT_MS = 5000;
const DISCONNECT_GRACE_PERIOD_MS = 5000;

export function useMediaMTXWebRTC(cameraId: string) {
  const [state, setState] = useState<WebRTCState>({
    status: 'idle',
    errorType: null,
    stream: null
  });

  const attemptIdRef = useRef<symbol | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const sessionUrlRef = useRef<string | null>(null);
  const backoffRef = useRef(INITIAL_BACKOFF);
  const retriesRef = useRef(0);
  const disconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cleanupSession = useCallback((sessionUrl: string | null) => {
    if (sessionUrl) {
      try {
        fetch(sessionUrl, { method: 'DELETE', keepalive: true }).catch(() => {});
      } catch (e) {
        // Best effort
      }
    }
  }, []);

  const connect = useCallback(async (isReconnect: boolean = false) => {
    const attemptId = Symbol('connection-attempt');
    attemptIdRef.current = attemptId;
    
    if (disconnectTimerRef.current) {
      clearTimeout(disconnectTimerRef.current);
      disconnectTimerRef.current = null;
    }
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (sessionUrlRef.current) {
      cleanupSession(sessionUrlRef.current);
      sessionUrlRef.current = null;
    }

    if (retriesRef.current >= MAX_RETRIES) {
      setState(prev => ({ ...prev, status: 'error', errorType: 'NETWORK_ERROR' }));
      return;
    }

    setState(prev => ({ 
      ...prev, 
      status: isReconnect ? 'reconnecting' : 'loading', 
      errorType: null 
    }));

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch(`/api/cctv/cameras/${cameraId}/stream`, {
        signal: abortController.signal
      });

      if (attemptIdRef.current !== attemptId) return;

      if (!response.ok) {
        if (response.status === 428) {
          const errData = await response.json().catch(() => ({}));
          if (errData?.error?.code === 'MISSING_CREDENTIALS') {
            throw new Error('MISSING_CREDENTIALS');
          }
        }
        throw new Error(response.status === 403 || response.status === 401 ? 'AUTH_ERROR' : 'STREAM_UNAVAILABLE');
      }

      const data = await response.json();
      const streamUrl = data.streamUrl;
      
      if (!streamUrl) {
        throw new Error('STREAM_UNAVAILABLE');
      }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });

      pc.ontrack = (event) => {
        if (attemptIdRef.current !== attemptId) return;
        setState(prev => ({ ...prev, stream: event.streams[0] }));
      };

      pc.oniceconnectionstatechange = () => {
        if (attemptIdRef.current !== attemptId) return;
        
        if (pc.iceConnectionState === 'failed') {
          handleFailure(attemptId);
        } else if (pc.iceConnectionState === 'disconnected') {
          disconnectTimerRef.current = setTimeout(() => {
            if (attemptIdRef.current === attemptId && pc.iceConnectionState === 'disconnected') {
               handleFailure(attemptId);
            }
          }, DISCONNECT_GRACE_PERIOD_MS);
        } else if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          if (disconnectTimerRef.current) {
            clearTimeout(disconnectTimerRef.current);
            disconnectTimerRef.current = null;
          }
          retriesRef.current = 0;
          backoffRef.current = INITIAL_BACKOFF;
          setState(prev => ({ ...prev, status: 'connected', errorType: null }));
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (attemptIdRef.current !== attemptId) return;

      await new Promise<void>((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }

        const timeout = setTimeout(() => {
          pc.removeEventListener('icegatheringstatechange', listener);
          resolve();
        }, ICE_GATHERING_TIMEOUT_MS);

        const listener = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            pc.removeEventListener('icegatheringstatechange', listener);
            resolve();
          }
        };

        pc.addEventListener('icegatheringstatechange', listener);
      });

      if (attemptIdRef.current !== attemptId) return;

      const sdpResponse = await fetch(streamUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: pc.localDescription?.sdp,
        signal: abortController.signal
      });

      // Capture and safely resolve Location
      let resolvedSessionUrl: string | null = null;
      if (sdpResponse.status === 201) {
        const locationHeader = sdpResponse.headers.get('location');
        if (locationHeader) {
          try {
            const streamUrlObj = new URL(streamUrl);
            const resolvedUrl = new URL(locationHeader, streamUrl);
            if (resolvedUrl.origin === streamUrlObj.origin) {
              resolvedUrl.search = '';
              resolvedUrl.hash = '';
              resolvedSessionUrl = resolvedUrl.toString();
            }
          } catch (e) {
            // Ignore parse errors, resolvedSessionUrl remains null
          }
        }
      }

      // If attempt is stale, cleanup the session immediately and return
      if (attemptIdRef.current !== attemptId) {
        if (resolvedSessionUrl) {
          cleanupSession(resolvedSessionUrl);
        }
        return;
      }

      if (sdpResponse.status === 401 || sdpResponse.status === 403) {
        if (resolvedSessionUrl) cleanupSession(resolvedSessionUrl);
        throw new Error('AUTH_ERROR');
      }
      
      if (!sdpResponse.ok || !resolvedSessionUrl) {
        if (resolvedSessionUrl) cleanupSession(resolvedSessionUrl);
        throw new Error('NEGOTIATION_ERROR');
      }

      sessionUrlRef.current = resolvedSessionUrl;

      const answerSdp = await sdpResponse.text();
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });

    } catch (err: any) {
      if (err.name === 'AbortError') return;
      if (attemptIdRef.current !== attemptId) return;
      
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (sessionUrlRef.current) {
        const urlToClean = sessionUrlRef.current;
        sessionUrlRef.current = null;
        cleanupSession(urlToClean);
      }

      const errorMessage = err.message;
      const finalErrorType: WebRTCErrorType = 
        ['AUTH_ERROR', 'STREAM_UNAVAILABLE', 'NEGOTIATION_ERROR', 'MISSING_CREDENTIALS'].includes(errorMessage) 
          ? (errorMessage as WebRTCErrorType)
          : 'NETWORK_ERROR';
      
      handleFailure(attemptId, finalErrorType);
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraId, cleanupSession]);

  const handleFailure = useCallback((attemptId: symbol, customError?: WebRTCErrorType) => {
    if (attemptIdRef.current !== attemptId) return;
    
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    
    if (customError === 'AUTH_ERROR' || customError === 'MISSING_CREDENTIALS') {
      setState(prev => ({ ...prev, status: 'error', errorType: customError }));
      return;
    }

    retriesRef.current += 1;
    
    if (retriesRef.current > MAX_RETRIES) {
      setState(prev => ({ ...prev, status: 'error', errorType: customError || 'NETWORK_ERROR' }));
      return;
    }
    
    setState(prev => ({ ...prev, status: 'reconnecting', errorType: null }));
    
    reconnectTimerRef.current = setTimeout(() => {
      if (attemptIdRef.current === attemptId) {
        connect(true);
      }
    }, backoffRef.current);
    
    backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
  }, [connect]);

  const retry = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    retriesRef.current = 0;
    backoffRef.current = INITIAL_BACKOFF;
    connect();
  }, [connect]);

  useEffect(() => {
    const attemptId = Symbol('init');
    
    connect();

    return () => {
      attemptIdRef.current = Symbol('unmount');
      
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
        disconnectTimerRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }
      if (sessionUrlRef.current) {
        const urlToClean = sessionUrlRef.current;
        sessionUrlRef.current = null;
        cleanupSession(urlToClean);
      }
    };
  }, [connect, cleanupSession]);

  return { ...state, retry };
}
