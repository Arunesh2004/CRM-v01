"use client";

import { SignOutButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <div className="flex h-screen flex-col items-center justify-center bg-[#070B18] text-[#E7EAF5] p-4 text-center">
      <div className="max-w-md w-full bg-white/5 rounded-xl border border-white/10 p-8 backdrop-blur-md shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
          <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold font-display text-white mb-3">Account Not Provisioned</h1>
        <p className="mb-8 text-[#8891B0] leading-relaxed">
          Your Clerk account is authenticated, but you do not have an active CRM identity.<br/><br/>
          Please use a valid invitation link or contact your administrator to provision your account.
        </p>
        <SignOutButton>
          <button className="w-full rounded-lg bg-red-600/90 px-6 py-3 text-sm font-semibold text-white hover:bg-red-500 transition-colors shadow-lg">
            Sign Out
          </button>
        </SignOutButton>
      </div>
    </div>
  );
}
