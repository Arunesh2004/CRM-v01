import prisma from '@/../database/utils/prisma';
import { withTenant, withTenantTransaction } from '@/../database/utils/prisma-tenant';
import { requirePermissionFast } from '@/lib/auth';
import { Action, Resource } from '@prisma/client';
import { FieldSecurityService, SecurityLevel } from '../security/field-security/field-security.service';

export class ForecastService {
  /**
   * Set or update a sales quota for a user securely.
   */
  static async setSalesQuota(userId: string, tenantId: string, data: { targetUserId: string; period: string; targetAmount: number }) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.UPDATE);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      let quota = await tx.salesQuota.findFirst({
        where: {
          tenantId,
          userId: data.targetUserId,
          period: data.period,
        },
      });

      if (quota) {
        quota = await tx.salesQuota.update({
          where: { id: quota.id },
          data: { targetAmount: data.targetAmount },
        });
      } else {
        quota = await tx.salesQuota.create({
          data: {
            tenantId,
            userId: data.targetUserId,
            period: data.period,
            targetAmount: data.targetAmount,
          },
        });
      }

      await tx.auditLog.create({
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
    });
  }

  /**
   * Securely read a quota, leveraging FieldSecurityService to mask if unauthorized for financial info.
   */
  static async getSalesQuota(userId: string, tenantId: string, quotaId: string) {
    await requirePermissionFast(userId, Resource.SALES_INTEL, Action.READ);

    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);

      const quota = await tx.salesQuota.findUnique({ where: { id: quotaId } });
      if (!quota || quota.tenantId !== tenantId) {
         throw new Error('Quota not found');
      }

      const hasFinancialAccess = await tx.userRole.findFirst({
        where: {
           userId,
           role: { permissions: { some: { permission: { resource: 'REVENUE', action: 'READ' } } } }
        }
      });

      if (!hasFinancialAccess) {
         return { ...quota, targetAmount: 0 }; 
      }

      return quota;
    });
  }

  /**
   * Snapshot an active deal (to be called by a cron job or workflow).
   */
  static async createDealSnapshot(tenantId: string, dealId: string) {
    return prisma.$transaction(async (baseTx) => {
      const tx = await withTenantTransaction(baseTx, tenantId);
      
      const deal = await tx.deal.findUnique({ where: { id: dealId } });
      if (!deal || deal.tenantId !== tenantId) throw new Error('Deal not found');

      const snapshot = await tx.dealSnapshot.create({
        data: {
          tenantId,
          dealId,
          value: deal.value,
          probability: deal.probability,
          stageId: deal.stageId,
          date: new Date(),
        },
      });

      await tx.auditLog.create({
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
    });
  }
}
