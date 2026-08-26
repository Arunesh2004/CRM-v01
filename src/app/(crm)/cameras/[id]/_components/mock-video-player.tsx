'use client';

import { useState, useEffect } from 'react';
import { Video, AlertTriangle, Loader2 } from 'lucide-react';

export function MockVideoPlayer({ streamUrl, expiresAt }: { streamUrl: string; expiresAt: Date | string }) {
  const [status, setStatus] = useState<'INITIALIZING' | 'CONNECTING' | 'LIVE' | 'EXPIRED'>('INITIALIZING');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    
    // Simulate connection delay
    const initTimer = setTimeout(() => setStatus('CONNECTING'), 1000);
    const liveTimer = setTimeout(() => {
      if (Date.now() < expiry) setStatus('LIVE');
    }, 2500);

    // Expiry countdown
    const countdown = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((expiry - now) / 1000));
      setTimeRemaining(diff);
      if (diff === 0) {
        setStatus('EXPIRED');
        clearInterval(countdown);
      }
    }, 1000);

    return () => {
      clearTimeout(initTimer);
      clearTimeout(liveTimer);
      clearInterval(countdown);
    };
  }, [expiresAt, streamUrl]);

  if (status === 'EXPIRED') {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
        <AlertTriangle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-xl text-rose-500 font-semibold mb-2">Stream Token Expired</h3>
        <p className="text-[#8891B0] text-sm">Please refresh to obtain a new secure token.</p>
      </div>
    );
  }

  if (status === 'INITIALIZING' || status === 'CONNECTING') {
    return (
      <div className="absolute inset-0 bg-black flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
        <p className="text-emerald-500 font-mono text-sm">
          {status === 'INITIALIZING' ? 'Authenticating Token...' : 'Establishing WSS Connection...'}
        </p>
      </div>
    );
  }

  // LIVE state with CSS scanning animation
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-zinc-950 overflow-hidden">
      {/* Fake Scanning Grid */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
        animation: 'pan-grid 10s linear infinite'
      }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/60 pointer-events-none" />

      {/* Scanning Line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.5)] z-10" style={{
        animation: 'scan-line 4s linear infinite'
      }} />

      {/* Target Reticle (Static) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-white/10 rounded-full flex items-center justify-center pointer-events-none">
        <div className="w-1 h-4 bg-white/30 absolute top-0"></div>
        <div className="w-1 h-4 bg-white/30 absolute bottom-0"></div>
        <div className="w-4 h-1 bg-white/30 absolute left-0"></div>
        <div className="w-4 h-1 bg-white/30 absolute right-0"></div>
        <div className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></div>
      </div>

      {/* Overlays */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-rose-500 animate-pulse" />
        <span className="text-white font-mono text-sm tracking-wider bg-black/50 px-2 py-0.5 rounded">LIVE DEMO</span>
      </div>

      <div className="absolute top-4 right-4 z-20">
        <span className="text-emerald-400 font-mono text-xs tracking-wider bg-black/50 px-2 py-1 border border-emerald-500/30 rounded flex items-center gap-2">
          TOKEN VALID: {formatTime(timeRemaining)}
        </span>
      </div>

      <div className="absolute bottom-4 left-4 z-20">
        <div className="text-white/70 font-mono text-[10px] break-all max-w-sm bg-black/50 p-2 rounded border border-white/10">
          Source: {streamUrl.split('?')[0]}...
        </div>
      </div>

      <div className="absolute bottom-4 right-4 z-20">
        <span className="text-white font-mono text-xs bg-black/50 px-2 py-1 rounded border border-white/10">
          {new Date().toLocaleTimeString()}
        </span>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pan-grid {
          0% { background-position: 0 0; }
          100% { background-position: -40px -40px; }
        }
        @keyframes scan-line {
          0% { top: -10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 110%; opacity: 0; }
        }
      `}} />
    </div>
  );
}
