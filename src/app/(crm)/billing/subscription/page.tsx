import { getSubscriptionAction } from '@/modules/billing/actions/billing.actions';
import { Card } from '@/components/ui/Card';
import { CreditCard, Zap, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export default async function BillingSubscriptionPage() {
  const result = await getSubscriptionAction();
  const sub = result.success ? result.data : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="glass-panel rounded-[1.25rem] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="font-display font-bold text-xl text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" /> Subscription & Billing
          </p>
          <p className="text-sm mt-1 text-[#8891B0]">Manage your AI-Security CRM plan and billing details.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="glass-panel overflow-hidden border-none shadow-none p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Current Plan</h2>
            <Badge variant={sub?.status === 'ACTIVE' ? 'emerald' : 'slate'}>
              {sub?.status || 'NO PLAN'}
            </Badge>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <p className="font-medium text-white text-lg">{sub?.planId || 'Free Tier'}</p>
                <p className="text-sm text-[#8891B0]">Billed monthly</p>
              </div>
            </div>

            <div className="pt-4 border-t border-white/[.04]">
              <p className="text-sm text-[#8891B0] mb-2">Plan features:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Advanced AI Lead Scoring
                </li>
                <li className="flex items-center gap-2 text-sm text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Omnichannel Inbox
                </li>
                <li className="flex items-center gap-2 text-sm text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Custom Roles & Permissions
                </li>
              </ul>
            </div>
          </div>
        </Card>

        <Card className="glass-panel overflow-hidden border-none shadow-none p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Billing Cycle</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-white/[.04]">
              <span className="text-sm text-[#8891B0]">Start Date</span>
              <span className="text-sm text-white">{sub?.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '-'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-white/[.04]">
              <span className="text-sm text-[#8891B0]">End Date</span>
              <span className="text-sm text-white">{sub?.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '-'}</span>
            </div>
             <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#8891B0]">Next Invoice</span>
              <span className="text-sm font-medium text-white">
                {sub?.planId ? '$-' : '$-'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
