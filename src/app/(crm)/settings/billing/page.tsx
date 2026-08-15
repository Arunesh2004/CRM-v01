import prisma from '@/../database/utils/prisma';
import { requireAuth, requireTenant } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { format } from 'date-fns';
import { CheckoutButton } from './CheckoutButton';

export default async function BillingPage() {
  await requireAuth();
  const tenantId = await requireTenant();

  const subscription = await prisma.subscription.findFirst({
    where: { tenantId, status: { in: ['ACTIVE', 'TRIAL'] } },
    include: { plan: true }
  });

  const isStripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  const currentCustomers = await prisma.customer.count({ where: { tenantId, deletedAt: null } });
  const currentEmployees = await prisma.user.count({ where: { tenantId, deletedAt: null } });
  
  const limits = subscription?.plan?.limits as any || { maxCustomers: 0, maxEmployees: 0 };
  const features = subscription?.plan?.features as any[] || [];

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-8 animate-in fade-in duration-500 pb-12">
      <div className="flex justify-between items-end border-b border-white/[.08] pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">Billing & Subscription</h1>
          <p className="text-[#8891B0] mt-2">Manage your subscription, limits, and payment methods.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="glass-panel border-white/[.08]">
          <CardHeader>
            <CardTitle className="text-white">Current Plan</CardTitle>
            <p className="text-sm text-[#8891B0]">Your active subscription tier.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-display font-bold text-white">{subscription?.plan?.name || 'No Plan'}</span>
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${subscription?.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-white/5 text-[#8891B0] border-white/[.08]'}`}>
                {subscription?.status || 'INACTIVE'}
              </span>
            </div>
            
            <div className="text-sm text-[#8891B0] bg-white/[.02] border border-white/[.04] p-4 rounded-xl">
              <p>Price: <span className="font-bold text-white">${Number(subscription?.plan?.price || 0).toFixed(2)}</span> <span className="text-[10px] uppercase tracking-wider">/ {subscription?.plan?.billingCycle}</span></p>
              {subscription && (
                <p className="mt-1">Renews on: <span className="font-semibold text-white">{format(new Date(subscription.renewalDate), 'MMMM d, yyyy')}</span></p>
              )}
            </div>

            <div className="pt-4 border-t border-white/[.04]">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Features</h4>
              <ul className="text-sm text-[#8891B0] space-y-3">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-emerald-400 mr-3 mt-0.5">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <div className="flex items-center p-6 pt-0">
            {!isStripeConfigured ? (
              <Button disabled variant="outline" className="w-full text-rose-400 border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/10 hover:text-rose-400 font-semibold">
                Payment provider not configured
              </Button>
            ) : subscription?.plan ? (
              <div className="w-full">
                <CheckoutButton planId={subscription.plan.id} />
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="glass-panel border-white/[.08]">
          <CardHeader>
            <CardTitle className="text-white">Usage Limits</CardTitle>
            <p className="text-sm text-[#8891B0]">Your current resource usage against plan limits.</p>
          </CardHeader>
          <CardContent className="space-y-8">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-white">Employees</span>
                <span className="text-[#8891B0] font-mono text-xs">{currentEmployees} / {limits.maxEmployees === -1 ? 'Unlimited' : limits.maxEmployees}</span>
              </div>
              <div className="w-full bg-white/[.04] rounded-full h-2 overflow-hidden border border-white/[.02]">
                <div 
                  className={`h-2 rounded-full ${limits.maxEmployees !== -1 && currentEmployees >= limits.maxEmployees ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-violet-500 shadow-[0_0_10px_rgba(124,92,252,0.8)]'}`}
                  style={{ width: limits.maxEmployees === -1 ? '100%' : `${Math.min(100, (currentEmployees / limits.maxEmployees) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-semibold text-white">Customers</span>
                <span className="text-[#8891B0] font-mono text-xs">{currentCustomers} / {limits.maxCustomers === -1 ? 'Unlimited' : limits.maxCustomers}</span>
              </div>
              <div className="w-full bg-white/[.04] rounded-full h-2 overflow-hidden border border-white/[.02]">
                <div 
                  className={`h-2 rounded-full ${limits.maxCustomers !== -1 && currentCustomers >= limits.maxCustomers ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)]' : 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.8)]'}`}
                  style={{ width: limits.maxCustomers === -1 ? '100%' : `${Math.min(100, (currentCustomers / limits.maxCustomers) * 100)}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
