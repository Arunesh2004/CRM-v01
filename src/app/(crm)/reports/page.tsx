import { Suspense } from 'react';
import { getDashboardMetricsAction } from '@/modules/reporting/actions/reporting.actions';
import { DateFilter } from '@/components/reporting/DateFilter';
import { DashboardClientView } from '@/components/reporting/DashboardClientView';
import { EmptyState } from '@/components/ui/EmptyState';
import { LayoutDashboard } from 'lucide-react';

export default async function ReportsPage({ searchParams }: { searchParams: { start?: string, end?: string } }) {
  const startDate = searchParams.start ? new Date(searchParams.start) : undefined;
  const endDate = searchParams.end ? new Date(searchParams.end) : undefined;

  const res = await getDashboardMetricsAction(startDate, endDate);
  const metrics = res.success ? res.data : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Intelligence & Analytics</h1>
          <p className="text-[#8891B0] mt-2">Enterprise Command Center</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Note: DateFilter is visually preserved but only works if fully implemented in server action. */}
          <DateFilter currentStart={searchParams.start} currentEnd={searchParams.end} />
          {/* Export Controls disabled/removed to prevent fake UI unless fully implemented */}
        </div>
      </div>

      {!metrics ? (
        <div className="h-[50vh] flex items-center justify-center">
          <EmptyState 
            title="Analytics Unavailable" 
            description="Failed to load dashboard metrics. Please check server connections."
            icon={<LayoutDashboard className="w-16 h-16 opacity-30 text-rose-500" />}
          />
        </div>
      ) : (
        <Suspense fallback={<div className="h-[50vh] flex items-center justify-center animate-pulse text-[#8891B0]">Loading Analytics Engine...</div>}>
          <DashboardClientView metrics={metrics} />
        </Suspense>
      )}
    </div>
  );
}
