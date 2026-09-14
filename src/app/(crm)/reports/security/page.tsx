import { Suspense } from 'react';
import { getSecurityMetrics, getCameraMetrics } from '@/modules/reporting/reporting.service';
import { DateFilter } from '@/components/reporting/DateFilter';
import { ExportControls } from '@/components/reporting/ExportControls';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldAlert } from 'lucide-react';
import { parseDateRange } from '@/lib/utils/date-range';
import { SecurityMetricsCard } from '@/components/reporting/SecurityMetricsCard';
import { CameraMetricsCard } from '@/components/reporting/CameraMetricsCard';

export default async function SecurityReportPage(props: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const searchParams = await props.searchParams;
  const { startDate, endDate } = parseDateRange(searchParams.start, searchParams.end);

  let securityMetrics = null;
  let cameraMetrics = null;
  try {
    const [sec, cam] = await Promise.all([
      getSecurityMetrics(startDate, endDate),
      getCameraMetrics()
    ]);
    securityMetrics = sec;
    cameraMetrics = cam;
  } catch (error) {
    securityMetrics = null;
    cameraMetrics = null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 border-b border-white/[.08] pb-6 mt-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Security Report</h1>
          <p className="text-[#8891B0] mt-2">Curated Security & Infrastructure Metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <DateFilter currentStart={searchParams.start} currentEnd={searchParams.end} />
          <ExportControls startDate={searchParams.start} endDate={searchParams.end} />
        </div>
      </div>

      {!securityMetrics ? (
        <div className="h-[50vh] flex items-center justify-center">
          <EmptyState 
            title="Analytics Unavailable" 
            description="Failed to load security metrics. Please check server connections or permissions."
            icon={<ShieldAlert className="w-16 h-16 opacity-30 text-rose-500" />}
          />
        </div>
      ) : (
        <Suspense fallback={<div className="h-[50vh] flex items-center justify-center animate-pulse text-[#8891B0]">Loading Security Engine...</div>}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <SecurityMetricsCard security={securityMetrics} />
            <CameraMetricsCard camera={cameraMetrics} />
          </div>
        </Suspense>
      )}
    </div>
  );
}
