'use client';
import { useRouter } from 'next/navigation';

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
      <button onClick={() => handleFilter(0)} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">All Time</button>
      <button onClick={() => handleFilter(7)} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">Last 7 Days</button>
      <button onClick={() => handleFilter(30)} className="px-3 py-1 bg-white border border-gray-300 rounded text-sm hover:bg-gray-50">Last 30 Days</button>
    </div>
  );
}
