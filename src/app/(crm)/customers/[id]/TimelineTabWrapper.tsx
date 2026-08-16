import { Suspense } from 'react';
import { CustomerActivityTimeline } from '@/components/crm/CustomerActivityTimeline';
import { getCustomerTimelineAction } from '@/modules/crm/actions/customer.actions';

export async function TimelineTabWrapper({ customerId }: { customerId: string }) {
  const timelineResult = await getCustomerTimelineAction({ customerId, limit: 100 });
  const timelineEvents = timelineResult.success ? (timelineResult.data as any).data : [];
  
  return (
    <div className="glass-panel p-6 animate-in fade-in duration-500">
      <h3 className="text-lg font-display font-semibold text-white mb-6">Unified Timeline</h3>
      <CustomerActivityTimeline activities={timelineEvents} />
    </div>
  );
}
