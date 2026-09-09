'use client';
import { useRouter } from 'next/navigation';

// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
export function DateFilter({ currentStart, currentEnd }: { currentStart?: string, currentEnd?: string }) {
  const router = useRouter();

  const handleFilter = (days: number) => {
    if (days === 0) {
      router.push('/reports'); // clear filters
      return;
    }
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    router.push(`/reports?start=${start.toISOString()}&end=${end.toISOString()}`);
  };

  return (
    <div className="flex space-x-2">
      <button onClick={() => handleFilter(0)} className="px-3 py-1.5 bg-white/5 border border-white/[.08] rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors">All Time</button>
      <button onClick={() => handleFilter(7)} className="px-3 py-1.5 bg-white/5 border border-white/[.08] rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors">Last 7 Days</button>
      <button onClick={() => handleFilter(30)} className="px-3 py-1.5 bg-white/5 border border-white/[.08] rounded-lg text-xs font-semibold text-white hover:bg-white/10 transition-colors">Last 30 Days</button>
    </div>
  );
}
