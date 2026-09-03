'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function AcceptInvitePage() {
  const { isLoaded, isSignedIn, user } = useUser();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'processing' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const token = searchParams.get('token');

  useEffect(() => {
    if (!isLoaded) return;

    if (!token) {
      setStatus('error');
      setErrorMsg('No invitation token provided.');
      return;
    }

    if (!isSignedIn) {
      // User needs to sign in or sign up first
      setStatus('error');
      setErrorMsg('Please sign in or create an account with your invited email to accept the invitation.');
      return;
    }

    const processInvite = async () => {
      setStatus('processing');
      try {
        const res = await fetch('/api/auth/accept-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          // Redirect to onboarding after a short delay
          setTimeout(() => {
            router.push('/onboarding');
          }, 2000);
        } else {
          setStatus('error');
          setErrorMsg(data.error || 'Failed to accept invitation.');
        }
      } catch (err: any) {
        setStatus('error');
        setErrorMsg('An unexpected error occurred. Please try again.');
      }
    };

    processInvite();
  }, [isLoaded, isSignedIn, token, router]);

  if (!isLoaded || status === 'loading') {
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
          Invitation
        </h2>
        
        {status === 'processing' && (
          <div className="mt-2 text-sm text-gray-600">
            <p>Processing your invitation...</p>
            <div className="mt-4 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mt-2 text-sm text-green-600">
            <p>Invitation accepted successfully!</p>
            <p className="mt-2 text-gray-500">Redirecting you to setup your profile...</p>
          </div>
        )}

        {status === 'error' && (
          <div className="mt-2">
            <div className="bg-red-50 text-red-700 p-4 rounded-md text-sm mb-4">
              {errorMsg}
            </div>
            {!isSignedIn && (
              <div className="space-y-4">
                <Link
                  href={`/sign-in?redirect_url=/accept-invite?token=${token}`}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign In
                </Link>
                <Link
                  href={`/sign-up?redirect_url=/accept-invite?token=${token}`}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
