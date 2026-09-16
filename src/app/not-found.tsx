import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#070B18] text-[#E7EAF5] p-4">
      <div className="max-w-md w-full bg-white/5 rounded-xl border border-white/10 p-8 text-center backdrop-blur-md">
        <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/5 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          <svg className="w-8 h-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold font-display text-white mb-2">Page Not Found</h2>
        <p className="text-[#8891B0] mb-6">
          We couldn&apos;t find the page you were looking for. It might have been moved or doesn&apos;t exist.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex w-full justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
