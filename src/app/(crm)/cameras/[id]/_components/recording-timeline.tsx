'use client';

import { useState } from 'react';
import { PlayCircle, Clock, X, Loader2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { generateRecordingDownloadUrlAction } from '@/modules/cctv/actions/recording.actions';

 
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
export function RecordingTimeline({ recordings }: { recordings: any[] }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  const [selectedRecording, setSelectedRecording] = useState<any>(null);
  const [playbackToken, setPlaybackToken] = useState<{ downloadUrl: string; expiresAt: Date } | null>(null);
  const [loading, setLoading] = useState(false);
   
  const [error, setError] = useState<string | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
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
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing */}
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
                  <video
                    src={playbackToken.downloadUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div className="absolute top-4 left-4 z-10 flex gap-2">
                    <a
                      href={playbackToken.downloadUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-black/50 hover:bg-black/80 backdrop-blur text-white text-sm font-medium px-4 py-2 rounded flex items-center gap-2 border border-white/10 transition-colors shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Recording
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
