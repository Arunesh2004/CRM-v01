import prisma from '@/../database/utils/prisma';
import { requireTenant, requirePermission, requireAuth } from '@/lib/auth';

export class BillingService {
  /**
   * Generates a checkout URL for a subscription plan.
   * Uses provider abstraction so it works in Demo and Production.
   */
  static async createCheckoutSession(planId: string) {
    const user = await requireAuth();
    const tenantId = await requireTenant();
    await requirePermission('BILLING', 'CREATE');
    
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new Error("Plan not found");

    // Integration with PaymentProvider (Demo or Stripe)
    const { PaymentProviderFactory } = await import('@/infrastructure/payment/payment.factory');
    const paymentProvider = PaymentProviderFactory.getPaymentProvider();
    
    const response = await paymentProvider.createCheckout(
      { tenantId, actorId: user.id },
      {
        amount: Number(plan.price),
        currency: 'USD',
        planId: plan.id,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing?success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/settings/billing?canceled=true`
      }
    );

    return { url: response.checkoutUrl, transactionId: response.transactionId };
  }

  /**
   * Syncs subscription state from the provider.
   */
  static async syncSubscription(tenantId: string, transactionId: string) {
    const { PaymentProviderFactory } = await import('@/infrastructure/payment/payment.factory');
    const paymentProvider = PaymentProviderFactory.getPaymentProvider();

    const verification = await paymentProvider.verifyPayment({ tenantId, actorId: 'SYSTEM' }, transactionId);
    
    if (verification.isSuccessful) {
      await prisma.subscription.updateMany({
        where: { tenantId },
        data: {
          status: 'ACTIVE'
        }
      });
    }
  }
}
