'use client';
import { useState } from 'react';
import { simulateCheckoutAction } from '@/modules/billing/actions/subscription.actions';
import { useRouter } from 'next/navigation';

export function SubscriptionCard({ subscription, plans }: { subscription: any, plans: any[] }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    const res = await simulateCheckoutAction(planId);
    if (res.success) {
      alert('Checkout completed (Demo Mock)! Plan upgraded.');
      router.refresh();
    } else {
      alert('Error upgrading plan.');
    }
    setLoading(false);
  };

  const currentPlan = subscription?.plan;

  return (
    <div className="bg-white shadow rounded-lg p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">Current Subscription</h2>
      {currentPlan ? (
        <div>
          <p className="text-lg font-semibold">{currentPlan.name} Plan</p>
          <p className="text-gray-500 mb-2">Status: <span className="font-bold text-green-600">{subscription.status}</span></p>
          <p className="text-sm text-gray-400 mb-4">Renews on: {new Date(subscription.renewalDate).toLocaleDateString()}</p>
        </div>
      ) : (
        <p className="text-gray-500 mb-4">No active subscription.</p>
      )}

      <h3 className="font-semibold mb-3 mt-6 border-t pt-4">Available Plans</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map(p => (
          <div key={p.id} className={`border rounded p-4 flex flex-col ${currentPlan?.id === p.id ? 'border-blue-500 bg-blue-50' : ''}`}>
            <h4 className="font-bold">{p.name}</h4>
            <p className="text-2xl font-black my-2">${Number(p.price)}</p>
            <p className="text-sm text-gray-600 flex-grow">{p.billingCycle}</p>
            {currentPlan?.id !== p.id && (
              <button
                onClick={() => handleUpgrade(p.id)}
                disabled={loading}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full"
              >
                {loading ? 'Processing...' : 'Upgrade'}
              </button>
            )}
            {currentPlan?.id === p.id && (
              <span className="mt-4 text-center font-bold text-blue-600 py-2 w-full inline-block">Current Plan</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
