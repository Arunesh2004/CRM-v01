'use client';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export function DateFilter(props: { currentStart?: string, currentEnd?: string }) {
  return (
    <Suspense fallback={<div className="h-8 w-48 bg-white/5 animate-pulse rounded-lg" />}>
      <DateFilterInner {...props} />
    </Suspense>
  );
}

function DateFilterInner({ currentStart, currentEnd }: { currentStart?: string, currentEnd?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleFilter = (days: number) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (days === 0) {
      params.delete('start');
      params.delete('end');
    } else {
      const end = new Date();
      // Inclusive end of current day (or just use current time)
      const start = new Date();
      start.setDate(end.getDate() - days);
      start.setHours(0, 0, 0, 0); // start of day

      params.set('start', start.toISOString());
      params.set('end', end.toISOString());
    }
    
    router.push(`${pathname}?${params.toString()}`);
  };

  const isAllTime = !currentStart && !currentEnd;
  
  // Simple check for which button is active based on days delta (approx)
  let activeDays = 0;
  if (currentStart && currentEnd) {
    const s = new Date(currentStart);
    const e = new Date(currentEnd);
    if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
      const diffTime = Math.abs(e.getTime() - s.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      // loosely map back to 7 or 30
      if (diffDays >= 6 && diffDays <= 8) activeDays = 7;
      else if (diffDays >= 28 && diffDays <= 32) activeDays = 30;
      else activeDays = diffDays;
    }
  }

  const getBtnClass = (isActive: boolean) => 
    `px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
      isActive 
        ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 hover:bg-violet-500/30' 
        : 'bg-white/5 border-white/[.08] text-white hover:bg-white/10'
    }`;

  return (
    <div className="flex space-x-2">
      <button onClick={() => handleFilter(0)} className={getBtnClass(isAllTime)}>All Time</button>
      <button onClick={() => handleFilter(7)} className={getBtnClass(activeDays === 7)}>Last 7 Days</button>
      <button onClick={() => handleFilter(30)} className={getBtnClass(activeDays === 30)}>Last 30 Days</button>
    </div>
  );
}
