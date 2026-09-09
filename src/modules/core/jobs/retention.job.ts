import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { inngest } from '@/lib/queue/inngest.client';

export const dataRetentionCron = inngest.createFunction(
  { id: 'data-retention-cron' },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  async ({ step }: { step: any }) => {
    // 1. Fetch all tenants
    const tenants = await step.run('fetch-tenants', async () => {
      return executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
        return tx.tenant.findMany({
          select: { id: true, rpoPolicy: true }
        });
      });
    });

    // 2. Process each tenant separately to prevent cross-tenant errors
    for (const tenant of tenants) {
      await step.run(`prune-tenant-${tenant.id}`, async () => {
        // Define retention based on policy
        let retentionDays = 30; // BASIC
        if (tenant.rpoPolicy === 'STANDARD') retentionDays = 90;
        if (tenant.rpoPolicy === 'ENTERPRISE') retentionDays = 365;

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

        await executeAsSystem(SystemOperation.PLATFORM_CRON, async (tx) => {
          // Batch delete CameraEvents
          await tx.cameraEvent.deleteMany({
            where: {
              tenantId: tenant.id,
              timestamp: { lt: cutoffDate }
            }
          });

          // Batch delete AIEvents
          await tx.aIEvent.deleteMany({
            where: {
              tenantId: tenant.id,
              timestamp: { lt: cutoffDate }
            }
          });

          // Batch delete WebhookEvents
          await tx.webhookEvent.deleteMany({
            where: {
              tenantId: tenant.id,
              createdAt: { lt: cutoffDate }
            }
          });
        });
      });
    }

    return { success: true, processedTenants: tenants.length };
  }
);
