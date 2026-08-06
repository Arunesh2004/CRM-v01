'use client';
import { createSubscriptionAction } from '@/modules/billing/actions/subscription.actions';

export default function PlanCard({ plan }: { plan: any }) {
  const handleSelect = async () => {
    const res = await createSubscriptionAction({ planId: plan.id });
    if (res.success) {
      window.location.href = '/billing/subscription';
    } else {
      alert(`Error: ${res.error}`);
    }
  };

  return (
    <div className="border border-slate-200 p-6 rounded-lg bg-white shadow-sm hover:shadow-md transition">
      <h3 className="text-xl font-bold text-slate-800">{plan.name}</h3>
      <p className="text-2xl text-blue-600 font-semibold mt-2">${plan.price} <span className="text-sm text-slate-500 font-normal">/{plan.billingCycle}</span></p>
      <div className="mt-4 text-sm text-slate-600">
        <p>Max Users: {plan.limits?.maxUsers || 'Unlimited'}</p>
        <p>Storage: {plan.limits?.maxStorage || '10GB'}</p>
      </div>
      <button onClick={handleSelect} className="mt-6 w-full py-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition">
        Select Plan
      </button>
    </div>
  );
}
