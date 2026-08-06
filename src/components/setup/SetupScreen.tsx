import React from 'react';

interface SetupScreenProps {
  missingVars: string[];
}

export default function SetupScreen({ missingVars }: SetupScreenProps) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-white rounded-lg shadow-xl p-8 border border-red-100">
          <div className="flex items-center space-x-3 mb-6 text-red-600">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-2xl font-bold">Configuration Error</h1>
          </div>
          
          <p className="text-gray-700 mb-6">
            The application cannot start because mandatory environment variables are missing.
            Please configure your <code className="bg-gray-100 px-1 py-0.5 rounded">.env</code> file.
          </p>

          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <h2 className="text-sm font-semibold text-red-800 uppercase tracking-wider mb-2">Missing Variables</h2>
            <ul className="space-y-1 list-disc list-inside text-red-700 font-mono text-sm">
              {missingVars.map(v => <li key={v}>{v}</li>)}
            </ul>
          </div>

          <div className="text-sm text-gray-500">
            <p className="font-semibold mb-1">Local Development:</p>
            <p>Ensure you have created a Clerk development instance and added the API keys. Restart the development server after saving your changes.</p>
          </div>
        </div>
      </body>
    </html>
  );
}
