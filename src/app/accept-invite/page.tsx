'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from '@/lib/auth/SessionProvider';

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#070B18] text-[#8891B0]">Loading invite...</div>}>
      <AcceptInviteInner />
    </Suspense>
  );
}

function AcceptInviteInner() {
  const { isLoaded, refresh } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [status, setStatus] = useState<'initial' | 'processing' | 'success' | 'error'>('initial');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!isLoaded) return;
    if (!token) {
      setStatus('error');
      setErrorMsg('No invitation token provided.');
    }
  }, [isLoaded, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters');
      return;
    }

    setStatus('processing');
    setErrorMsg('');

    try {
      const res = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        await refresh();
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setStatus('error');
        setErrorMsg(data.error || 'Failed to accept invitation.');
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg('An unexpected error occurred. Please try again.');
    }
  };

  if (!isLoaded || status === 'initial' && !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Accept Invitation
        </h2>
        
        {status === 'processing' && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Setting up your account...</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-2 text-sm text-green-600">
            <p>Invitation accepted successfully!</p>
            <p className="mt-2 text-gray-500">Redirecting to your dashboard...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-2 text-sm text-red-600 bg-red-50 p-4 rounded-md">
            {errorMsg}
          </div>
        )}

        {(status === 'initial' || status === 'error') && token && (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left" htmlFor="password">
                  Create Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 text-left" htmlFor="confirm-password">
                  Confirm Password
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  placeholder="Confirm Password"
                />
              </div>
            </div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Set Password & Accept
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
