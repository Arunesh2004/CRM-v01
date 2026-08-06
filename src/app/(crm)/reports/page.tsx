import { Suspense } from 'react';
import { getDashboardMetricsAction } from '@/modules/reporting/actions/reporting.actions';
import { SecurityMetricsCard } from '@/components/reporting/SecurityMetricsCard';
import { CameraMetricsCard } from '@/components/reporting/CameraMetricsCard';
import { CrmMetricsCard } from '@/components/reporting/CrmMetricsCard';
import { CommunicationMetricsCard } from '@/components/reporting/CommunicationMetricsCard';
import { ExportControls } from '@/components/reporting/ExportControls';
import { DateFilter } from '@/components/reporting/DateFilter';

export default async function ReportsPage({ searchParams }: { searchParams: { start?: string, end?: string } }) {
  const startDate = searchParams.start ? new Date(searchParams.start) : undefined;
  const endDate = searchParams.end ? new Date(searchParams.end) : undefined;

  const res = await getDashboardMetricsAction(startDate, endDate);
  const metrics = res.success ? res.data : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded shadow">
        <h1 className="text-2xl font-bold text-gray-800">Reporting & Analytics</h1>
        <div className="flex space-x-4">
          <DateFilter currentStart={searchParams.start} currentEnd={searchParams.end} />
          <ExportControls startDate={searchParams.start} endDate={searchParams.end} />
        </div>
      </div>

      {!metrics ? (
        <div className="text-red-500 bg-white p-4 shadow rounded">Failed to load metrics</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Suspense fallback={<div>Loading...</div>}>
            <SecurityMetricsCard data={metrics.security} />
          </Suspense>
          <Suspense fallback={<div>Loading...</div>}>
            <CameraMetricsCard data={metrics.camera} />
          </Suspense>
          <Suspense fallback={<div>Loading...</div>}>
            <CrmMetricsCard data={metrics.crm} />
          </Suspense>
          <Suspense fallback={<div>Loading...</div>}>
            <CommunicationMetricsCard data={metrics.communication} />
          </Suspense>
        </div>
      )}
    </div>
  );
}
