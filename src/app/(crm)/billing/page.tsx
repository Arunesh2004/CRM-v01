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
      
      <div className="bg-amber-100 border-l-4 border-amber-500 p-4 mb-6 text-amber-900 rounded-md">
        <div className="flex items-center">
           <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
           <h3 className="font-bold text-lg">Billing Status: DEMO ONLY</h3>
        </div>
        <p className="mt-2 text-sm">
           <strong>Stripe Integration: Not Connected.</strong> This page contains simulated read-only data for demonstration purposes. No real payments, invoices, or subscriptions are active in this environment.
        </p>
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
