'use client';
import { updateSubscriptionStatusAction } from '@/modules/billing/actions/subscription.actions';

export default function SubscriptionCard({ subscription }: { subscription: any }) {
  if (!subscription) {
    return <div className="p-6 border rounded-lg bg-white text-slate-500">No active subscription found.</div>;
  }

  const handleCancel = async () => {
    if (confirm('Are you sure you want to cancel?')) {
      const res = await updateSubscriptionStatusAction({ subscriptionId: subscription.id, status: 'CANCELLED' });
      if (res.success) window.location.reload();
      else alert(`Error: ${res.error}`);
    }
  };

  return (
    <div className="border border-slate-200 p-6 rounded-lg bg-white shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Current Subscription</h3>
          <p className="text-sm text-slate-500 mt-1">Status: <span className="font-semibold text-slate-700">{subscription.status}</span></p>
        </div>
        {subscription.status !== 'CANCELLED' && (
          <button onClick={handleCancel} className="text-xs text-red-600 hover:underline">Cancel</button>
        )}
      </div>
      <div className="mt-4 text-sm text-slate-600 grid grid-cols-2 gap-4">
        <div>
          <p className="font-medium text-slate-900">Start Date</p>
          <p>{new Date(subscription.startDate).toLocaleDateString()}</p>
        </div>
        <div>
          <p className="font-medium text-slate-900">Renewal Date</p>
          <p>{new Date(subscription.renewalDate).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
