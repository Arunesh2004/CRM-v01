import { withTenant } from '@db/utils/prisma-tenant';
import { BILLING_PLANS, PlanId, PlanConfig } from './constants/plans';

export class BillingService {
  static async getSubscription(tenantId: string) {
    const prisma = withTenant(tenantId);
    let sub = await prisma.subscription.findFirst({
      where: { tenantId }
    });

    if (!sub) {
      sub = await prisma.subscription.create({
        data: {
          tenantId,
          status: 'ACTIVE',
          planId: 'FREE',
          currentPeriodEnd: new Date(new Date().setFullYear(new Date().getFullYear() + 10))
        }
      });
    }

    return sub;
  }

  static getAvailablePlans(): PlanConfig[] {
    return Object.values(BILLING_PLANS);
  }

  static async getTenantUsage(tenantId: string) {
    const prisma = withTenant(tenantId);

    const [usersCount, camerasCount, documents] = await Promise.all([
      prisma.user.count({ where: { tenantId, deletedAt: null } }),
      prisma.camera.count({ where: { tenantId, deletedAt: null } }),
      prisma.document.aggregate({
        _sum: { sizeBytes: true },
        where: { tenantId }
      })
    ]);

    const storageBytes = documents._sum.sizeBytes || 0;

    return {
      users: usersCount,
      cameras: camerasCount,
      storageBytes
    };
  }

  static async getInvoices(tenantId: string) {
    const prisma = withTenant(tenantId);
    return prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async getInvoiceById(tenantId: string, invoiceId: string) {
    const prisma = withTenant(tenantId);
    return prisma.invoice.findFirst({
      where: { 
        id: invoiceId,
        tenantId 
      }
    });
  }

  static async upgradeSubscription(tenantId: string, planId: string) {
    const plan = BILLING_PLANS[planId as PlanId];
    if (!plan) {
      throw new Error(`Invalid plan: ${planId}`);
    }

    const prisma = withTenant(tenantId);
    const sub = await this.getSubscription(tenantId);

    const updatedSub = await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: plan.id,
        status: 'ACTIVE',
        currentPeriodEnd: new Date(new Date().setMonth(new Date().getMonth() + 1))
      }
    });

    if (plan.price > 0) {
      await prisma.invoice.create({
        data: {
          tenantId,
          amountDue: plan.price,
          amountPaid: plan.price,
          status: 'PAID'
        }
      });
    }

    return updatedSub;
  }
}
