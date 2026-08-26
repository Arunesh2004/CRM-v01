'use client';

import { useState } from 'react';
import { PlayCircle, Clock, X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { generateRecordingDownloadUrlAction } from '@/modules/cctv/actions/recording.actions';

export function RecordingTimeline({ recordings }: { recordings: any[] }) {
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [playbackToken, setPlaybackToken] = useState<{ downloadUrl: string; expiresAt: Date } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePlayRecording = async (recording: any) => {
    setSelectedRecording(recording);
    setPlaybackToken(null);
    setError(null);
    setLoading(true);

    const res = await generateRecordingDownloadUrlAction(recording.id);
    if (res.success && res.data) {
      setPlaybackToken(res.data);
    } else {
      setError(res.error || 'Failed to authorize playback.');
    }
    setLoading(false);
  };

  const closePlayback = () => {
    setSelectedRecording(null);
    setPlaybackToken(null);
    setError(null);
  };

  return (
    <>
      <div className="glass-panel rounded-xl p-6 relative">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-400" /> Recent Recordings (DVR)
        </h3>
        {recordings.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {recordings.map((rec: any) => (
              <div 
                key={rec.id} 
                onClick={() => handlePlayRecording(rec)}
                className="bg-white/5 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer group"
              >
                <div className="aspect-video bg-black/40 rounded flex items-center justify-center mb-2 relative overflow-hidden">
                  <PlayCircle className="w-8 h-8 text-white/50 group-hover:text-violet-400 transition-colors z-10" />
                  <div className="absolute inset-0 bg-gradient-to-t from-violet-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-white font-medium">{new Date(rec.startTime).toLocaleTimeString()}</p>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-[#8891B0]">{(rec.sizeBytes / 1024 / 1024).toFixed(1)} MB</p>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                    rec.status === 'PROCESSING' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {rec.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#8891B0]">No recent recordings available.</p>
        )}
      </div>

      {/* Playback Modal */}
      {selectedRecording && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel rounded-xl overflow-hidden shadow-2xl w-full max-w-4xl flex flex-col max-h-screen">
            <div className="flex justify-between items-center p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-violet-400" />
                <h3 className="text-white font-semibold">Recording Playback</h3>
                <span className="text-[#8891B0] text-sm ml-2">{new Date(selectedRecording.startTime).toLocaleString()}</span>
              </div>
              <button onClick={closePlayback} className="text-[#8891B0] hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="relative aspect-video bg-black flex flex-col items-center justify-center p-6 text-center overflow-hidden">
              {loading && (
                <>
                  <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                  <p className="text-emerald-500 font-mono text-sm">Authorizing secure token...</p>
                </>
              )}
              
              {error && (
                <>
                  <AlertTriangle className="w-10 h-10 text-rose-500 mb-4" />
                  <p className="text-rose-500 font-semibold mb-1">Access Denied</p>
                  <p className="text-[#8891B0] text-sm">{error}</p>
                </>
              )}

              {playbackToken && !loading && !error && (
                <>
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-violet-500 via-transparent to-transparent pointer-events-none" />
                  
                  <ShieldCheck className="w-12 h-12 text-emerald-400 mb-4 animate-in zoom-in duration-500" />
                  <h3 className="text-xl text-emerald-400 font-semibold mb-2">Token Authorized</h3>
                  <p className="text-white mb-6">Simulating secure playback...</p>
                  
                  {/* Fake progress bar */}
                  <div className="w-full max-w-md h-2 bg-white/10 rounded-full overflow-hidden relative">
                    <div className="absolute top-0 left-0 h-full bg-violet-500" style={{
                      animation: 'progress 10s linear infinite'
                    }} />
                  </div>

                  <div className="mt-8 text-left bg-white/5 p-4 rounded-lg border border-white/10 w-full max-w-lg">
                    <p className="text-xs text-[#8891B0] mb-1 font-mono uppercase tracking-wider">Secure Token Details</p>
                    <p className="text-[10px] text-white/70 font-mono break-all mb-2">{playbackToken.downloadUrl}</p>
                    <p className="text-[10px] text-emerald-400 font-mono">Expires: {new Date(playbackToken.expiresAt).toLocaleString()}</p>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes progress {
              0% { width: 0%; }
              100% { width: 100%; }
            }
          `}} />
        </div>
      )}
    </>
  );
}
