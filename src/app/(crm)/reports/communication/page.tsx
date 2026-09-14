import { Suspense } from 'react';
import { getCommunicationMetrics } from '@/modules/reporting/reporting.service';
import { DateFilter } from '@/components/reporting/DateFilter';
import { ExportControls } from '@/components/reporting/ExportControls';
import { EmptyState } from '@/components/ui/EmptyState';
import { Phone } from 'lucide-react';
import { parseDateRange } from '@/lib/utils/date-range';
import { CommunicationMetricsCard } from '@/components/reporting/CommunicationMetricsCard';

export default async function CommunicationReportPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const { startDate, endDate } = parseDateRange(searchParams.start, searchParams.end);

  let metrics;
  try {
    metrics = await getCommunicationMetrics(startDate, endDate);
  } catch (error) {
    metrics = null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-white/[.08] pb-6 mt-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Communication Report</h1>
          <p className="text-[#8891B0] mt-2">Curated Telephony & Messaging Metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <DateFilter currentStart={searchParams.start} currentEnd={searchParams.end} />
          <ExportControls startDate={searchParams.start} endDate={searchParams.end} />
        </div>
      </div>

      {!metrics ? (
        <div className="h-[50vh] flex items-center justify-center">
          <EmptyState 
            title="Analytics Unavailable" 
            description="Failed to load communication metrics. Please check server connections or permissions."
            icon={<Phone className="w-16 h-16 opacity-30 text-rose-500" />}
          />
        </div>
      ) : (
        <Suspense fallback={<div className="h-[50vh] flex items-center justify-center animate-pulse text-[#8891B0]">Loading Communication Engine...</div>}>
          <div className="grid grid-cols-1 gap-6">
            <CommunicationMetricsCard communication={metrics} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
