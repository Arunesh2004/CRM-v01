import { getPlansAction, getSubscriptionAction } from '@/modules/billing/actions/billing.actions';
import { PlansClientView } from './PlansClientView';
import { Layers } from 'lucide-react';
import { requireAuth } from '@/lib/auth';

export default async function BillingPlansPage() {
  await requireAuth(); // Server Action will enforce REVENUE:READ, but page auth is good practice

  const [plansRes, subRes] = await Promise.all([
    getPlansAction(),
    getSubscriptionAction()
  ]);

  const plans = plansRes.success ? (plansRes.data || []) : [];
  const subscription = subRes.success ? subRes.data : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-400" /> Billing Plans
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Choose the right plan for your team's security needs.</p>
        </div>
      </div>

      <PlansClientView plans={plans} currentPlanId={subscription?.planId || 'FREE'} />
    </div>
  );
}
