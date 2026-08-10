import prisma from '@/../database/utils/prisma';
import { SubscriptionStatus } from '@prisma/client';

export type FeatureLimit = 'MAX_CUSTOMERS' | 'MAX_EMPLOYEES';

export class FeatureAccessService {
  static async canAccessFeature(tenantId: string, feature: string): Promise<boolean> {
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true }
    });

    if (!subscription) return false;

    // Feature gates
    const planFeatures = subscription.plan.features as any;
    if (planFeatures && Array.isArray(planFeatures)) {
      return planFeatures.includes(feature) || planFeatures.includes('ALL');
    }

    return false;
  }

  static async enforceLimit(tenantId: string, limitType: FeatureLimit): Promise<void> {
    const subscription = await prisma.subscription.findFirst({
      where: { tenantId, status: { in: ['ACTIVE', 'TRIAL'] } },
      include: { plan: true }
    });

    if (!subscription) throw new Error("No active subscription found for tenant.");

    // Retrieve limit configurations from plan limits
    const limits = (subscription.plan as any)?.limits || {};
    
    if (limitType === 'MAX_CUSTOMERS') {
      const maxCustomers = limits.maxCustomers || 100;
      const currentCustomers = await prisma.customer.count({ where: { tenantId } });
      if (currentCustomers >= maxCustomers && maxCustomers !== -1) {
        throw new Error(`Limit reached: Your plan allows a maximum of ${maxCustomers} customers.`);
      }
    }

    if (limitType === 'MAX_EMPLOYEES') {
      const maxEmployees = limits.maxEmployees || 5;
      const currentEmployees = await prisma.user.count({ where: { tenantId } });
      if (currentEmployees >= maxEmployees && maxEmployees !== -1) {
        throw new Error(`Limit reached: Your plan allows a maximum of ${maxEmployees} employees.`);
      }
    }
  }
}
