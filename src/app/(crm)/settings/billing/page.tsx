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
    <div className="space-y-6 max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold">Billing & Subscription</h1>
          <p className="text-sm text-gray-500">Manage your subscription, limits, and payment methods.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <p className="text-sm text-muted-foreground">Your active subscription tier.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xl font-bold text-gray-900">{subscription?.plan?.name || 'No Plan'}</span>
              <Badge variant={subscription?.status === 'ACTIVE' ? 'success' : 'secondary'}>
                {subscription?.status || 'INACTIVE'}
              </Badge>
            </div>
            
            <div className="text-sm text-gray-600">
              <p>Price: <span className="font-medium">${Number(subscription?.plan?.price || 0).toFixed(2)}</span> / {subscription?.plan?.billingCycle}</p>
              {subscription && (
                <p>Renews on: <span className="font-medium">{format(new Date(subscription.renewalDate), 'MMMM d, yyyy')}</span></p>
              )}
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-2">Features</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                {features.map((feature, i) => (
                  <li key={i} className="flex items-center">
                    <span className="text-green-500 mr-2">✓</span> {feature}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          <div className="flex items-center p-6 pt-0">
            {!isStripeConfigured ? (
              <Button disabled variant="outline" className="w-full text-red-600 border-red-200 bg-red-50">
                Payment provider not configured
              </Button>
            ) : subscription?.plan ? (
              <div className="w-full">
                <CheckoutButton planId={subscription.plan.id} />
              </div>
            ) : null}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Usage Limits</CardTitle>
            <p className="text-sm text-muted-foreground">Your current resource usage against plan limits.</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Employees</span>
                <span className="text-gray-500">{currentEmployees} / {limits.maxEmployees === -1 ? 'Unlimited' : limits.maxEmployees}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${limits.maxEmployees !== -1 && currentEmployees >= limits.maxEmployees ? 'bg-red-500' : 'bg-blue-600'}`}
                  style={{ width: limits.maxEmployees === -1 ? '100%' : `${Math.min(100, (currentEmployees / limits.maxEmployees) * 100)}%` }}
                ></div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">Customers</span>
                <span className="text-gray-500">{currentCustomers} / {limits.maxCustomers === -1 ? 'Unlimited' : limits.maxCustomers}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${limits.maxCustomers !== -1 && currentCustomers >= limits.maxCustomers ? 'bg-red-500' : 'bg-blue-600'}`}
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
