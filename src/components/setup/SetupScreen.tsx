import React from 'react';

interface SetupScreenProps {
  missingVars: string[];
}

export default function SetupScreen({ missingVars }: SetupScreenProps) {
  return (
    <html lang="en">
      <body className="bg-[#06080F] min-h-screen flex items-center justify-center p-4">
        <div className="max-w-xl w-full glass-panel rounded-xl shadow-[0_0_50px_rgba(244,63,94,0.1)] p-8 border border-rose-500/20">
          <div className="flex items-center space-x-3 mb-6 text-rose-500">
            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-display font-bold">Configuration Error</h1>
          </div>
          
          <p className="text-[#8891B0] mb-6">
            The application cannot start because mandatory environment variables are missing.
            Please configure your <code className="bg-[#0D1326] px-2 py-1 rounded border border-white/[.04] text-white font-mono text-xs">.env</code> file.
          </p>

          <div className="bg-rose-500/5 border border-rose-500/20 rounded-lg p-5 mb-6">
            <h2 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3">Missing Variables</h2>
            <ul className="space-y-2 list-disc list-inside text-rose-300/80 font-mono text-xs">
              {missingVars.map(v => <li key={v}>{v}</li>)}
            </ul>
          </div>

          <div className="text-xs text-[#8891B0] bg-white/[.02] p-4 rounded-lg border border-white/[.04]">
            <p className="font-semibold mb-2 text-white/90">Local Development:</p>
            <p>Ensure you have created a Clerk development instance and added the API keys. Restart the development server after saving your changes.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
