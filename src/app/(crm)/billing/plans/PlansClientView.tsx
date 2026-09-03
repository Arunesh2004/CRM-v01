'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, Zap } from 'lucide-react';
import { upgradeSubscriptionAction } from '@/modules/billing/actions/billing.actions';
import { toast } from 'sonner';

export function PlansClientView({ plans, currentPlanId }: { plans: any[], currentPlanId: string | null }) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  const handleUpgrade = async (planId: string) => {
    setIsUpgrading(true);
    setSelectedPlanId(planId);
    try {
      const result = await upgradeSubscriptionAction(planId);
      if (result.success) {
        toast.success(`Successfully upgraded to ${planId}`);
        // Refresh the page to get new state
        window.location.reload();
      } else {
        toast.error(String(result.error) || 'Failed to upgrade plan');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsUpgrading(false);
      setSelectedPlanId(null);
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6 mt-6">
      {plans.map((plan) => (
        <Card key={plan.id} className="glass-panel overflow-hidden border-none shadow-none p-6 flex flex-col">
          <div className="mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" /> {plan.name}
            </h3>
            <p className="text-sm text-[#8891B0] mt-1 h-10">{plan.description}</p>
          </div>

          <div className="mb-6">
            <span className="text-3xl font-bold text-white">${plan.price}</span>
            <span className="text-sm text-[#8891B0]">/mo</span>
          </div>

          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Limits</p>
              <ul className="space-y-2">
                <li className="text-sm text-white">Users: {plan.limits.users > 1000 ? 'Unlimited' : plan.limits.users}</li>
                <li className="text-sm text-white">Storage: {plan.limits.storageBytes / (1024 * 1024 * 1024)} GB</li>
                <li className="text-sm text-white">Cameras: {plan.limits.cameras > 1000 ? 'Unlimited' : plan.limits.cameras}</li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#8891B0] uppercase tracking-wider">Features</p>
              <ul className="space-y-2">
                {plan.features.map((feature: any) => (
                  <li key={feature.id} className={`flex items-center gap-2 text-sm ${feature.included ? 'text-white' : 'text-[#8891B0] opacity-50'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${feature.included ? 'text-emerald-400' : 'text-slate-600'}`} /> 
                    {feature.name}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-white/[.04]">
            {currentPlanId === plan.id ? (
              <div className="w-full text-center py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg font-medium text-sm">
                Current Plan
              </div>
            ) : (
              <button
                onClick={() => handleUpgrade(plan.id)}
                disabled={isUpgrading}
                className="w-full text-center py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
              >
                {isUpgrading && selectedPlanId === plan.id ? 'Processing...' : 'Upgrade to ' + plan.name}
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
