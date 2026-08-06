import { Suspense } from 'react';
import { getAllNotificationsAction } from '@/modules/communication/actions/notification.actions';
import { CommunicationHistoryTable } from '@/components/communication/CommunicationHistoryTable';

export default async function CommunicationsPage() {
  const result = await getAllNotificationsAction();
  const notifications = result.success ? (result.data || []) : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Communication History</h1>
      </div>
      
      <Suspense fallback={<div>Loading communications...</div>}>
        <CommunicationHistoryTable notifications={notifications} />
      </Suspense>
    </div>
  );
}
