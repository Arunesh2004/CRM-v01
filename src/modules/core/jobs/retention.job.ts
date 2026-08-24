import { inngest } from '@/lib/queue/inngest.client';
import prisma from '@db/utils/prisma';
import { RpoPolicy } from '@prisma/client';

export const dataRetentionCron = inngest.createFunction(
  { id: 'data-retention-cron' },
  async ({ step }: { step: any }) => {
    // 1. Fetch all tenants
    const tenants = await step.run('fetch-tenants', async () => {
      return prisma.tenant.findMany({
        select: { id: true, rpoPolicy: true }
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

        // Batch delete CameraEvents
        await prisma.cameraEvent.deleteMany({
          where: {
            tenantId: tenant.id,
            timestamp: { lt: cutoffDate }
          }
        });

        // Batch delete AIEvents
        await prisma.aIEvent.deleteMany({
          where: {
            tenantId: tenant.id,
            timestamp: { lt: cutoffDate }
          }
        });

        // Batch delete WebhookEvents
        await prisma.webhookEvent.deleteMany({
          where: {
            tenantId: tenant.id,
            createdAt: { lt: cutoffDate }
          }
        });
      });
    }

    return { success: true, processedTenants: tenants.length };
  }
);
