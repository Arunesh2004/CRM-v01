import prisma from '@/../database/utils/prisma';
import { requirePermissionFast } from '@/lib/auth';
import { Action, Resource } from '@prisma/client';
import { FieldSecurityService, SecurityLevel } from '../security/field-security/field-security.service';

export class ForecastService {
  /**
   * Set or update a sales quota for a user securely.
   */
  static async setSalesQuota(userId: string, tenantId: string, data: { targetUserId: string; period: string; targetAmount: number }) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.UPDATE);

    // Look for existing
    let quota = await prisma.salesQuota.findFirst({
      where: {
        tenantId,
        userId: data.targetUserId,
        period: data.period,
      },
    });

    if (quota) {
      quota = await prisma.salesQuota.update({
        where: { id: quota.id },
        data: { targetAmount: data.targetAmount },
      });
    } else {
      quota = await prisma.salesQuota.create({
        data: {
          tenantId,
          userId: data.targetUserId,
          period: data.period,
          targetAmount: data.targetAmount,
        },
      });
    }

    // Write audit
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: userId,
        actorType: 'USER',
        action: 'QUOTA_UPDATED',
        resource: 'SalesQuota',
        resourceId: quota.id,
      },
    });

    return quota;
  }

  /**
   * Securely read a quota, leveraging FieldSecurityService to mask if unauthorized for financial info.
   */
  static async getSalesQuota(userId: string, tenantId: string, quotaId: string) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.READ);

    const quota = await prisma.salesQuota.findUnique({ where: { id: quotaId } });
    if (!quota || quota.tenantId !== tenantId) {
       throw new Error('Quota not found');
    }

    // Attempt to mask targetAmount using the same logic we use for revenue
    const hasFinancialAccess = await prisma.userRole.findFirst({
      where: {
         userId,
         role: { permissions: { some: { permission: { resource: 'REVENUE', action: 'READ' } } } }
      }
    });

    if (!hasFinancialAccess) {
       // Masked
       return { ...quota, targetAmount: 0 }; // or mask with a specific indicator
    }

    return quota;
  }

  /**
   * Snapshot an active deal (to be called by a cron job or workflow).
   */
  static async createDealSnapshot(tenantId: string, dealId: string) {
    // This is typically called by an automation or cron. 
    // The caller must ensure context is secure.
    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.tenantId !== tenantId) throw new Error('Deal not found');

    const snapshot = await prisma.dealSnapshot.create({
      data: {
        tenantId,
        dealId,
        value: deal.value,
        probability: deal.probability,
        stageId: deal.stageId,
        date: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        tenantId,
        actorId: 'SYSTEM',
        actorType: 'SYSTEM',
        action: 'DEAL_SNAPSHOT_CREATED',
        resource: 'DealSnapshot',
        resourceId: snapshot.id,
      },
    });

    return snapshot;
  }
}
