import { Suspense } from 'react';
import { getCurrentSubscriptionAction, getPlansAction } from '@/modules/billing/actions/subscription.actions';
import { getInvoicesAction } from '@/modules/billing/actions/invoice.actions';
import { getTenantUsageAction } from '@/modules/billing/actions/usage.actions';
import { SubscriptionCard } from '@/components/billing/SubscriptionCard';
import { UsageCard } from '@/components/billing/UsageCard';
import { InvoiceTable } from '@/components/billing/InvoiceTable';

export default async function BillingPage() {
  const [subRes, planRes, invRes, usageRes] = await Promise.all([
    getCurrentSubscriptionAction(),
    getPlansAction(),
    getInvoicesAction(),
    getTenantUsageAction(),
  ]);

  const subscription = subRes.success ? subRes.data : null;
  const plans = planRes.success ? (planRes.data || []) : [];
  const invoices = invRes.success ? (invRes.data || []) : [];
  const usage = usageRes.success ? usageRes.data : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing & Subscriptions</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Suspense fallback={<div className="bg-white p-6 shadow rounded">Loading subscription...</div>}>
            <SubscriptionCard subscription={subscription} plans={plans} />
          </Suspense>

          <Suspense fallback={<div className="bg-white p-6 shadow rounded">Loading invoices...</div>}>
            <InvoiceTable invoices={invoices} />
          </Suspense>
        </div>
        
        <div className="lg:col-span-1">
          <Suspense fallback={<div className="bg-white p-6 shadow rounded">Loading usage...</div>}>
            <UsageCard usage={usage} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
