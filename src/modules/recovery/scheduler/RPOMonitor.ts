import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { withTenant } from '@db/utils/prisma-tenant';

export interface RPOMetrics {
  tenantId: string;
  rpoPolicy: string;
  targetRPOHours: number;
  currentRPOHours: number | 'INFINITE';
  lastSuccessfulBackup: Date | null;
  status: 'GREEN' | 'YELLOW' | 'RED';
}

export class RPOMonitor {
  /**
   * Calculates RPO status for all tenants.
   */
  async getGlobalRPOStatus(): Promise<RPOMetrics[]> {
    return executeAsSystem(SystemOperation.DISASTER_RECOVERY, async (tx) => {
      const tenants = await tx.tenant.findMany({
        where: { status: { not: 'DELETED' } },
        select: { id: true, rpoPolicy: true }
      });

      // PostgreSQL DISTINCT ON guarantees the first row matching the ORDER BY clause
      const latestSnapshots = await tx.recoverySnapshot.findMany({
        where: { status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
        distinct: ['tenantId'],
        select: { id: true, tenantId: true, createdAt: true }
      });

      const snapshotMap = new Map(latestSnapshots.map((s: any) => [s.tenantId, s]));
      const metrics: RPOMetrics[] = [];
      
      for (const tenant of tenants) {
        metrics.push(this.calculateRpoSync(tenant.id, tenant.rpoPolicy, snapshotMap.get(tenant.id) || null));
      }
      return metrics;
    });
  }

  /**
   * Calculates the exact RPO metric and health status for a single tenant using a provided snapshot.
   */
  calculateRpoSync(tenantId: string, policy: string = 'BASIC', latestSnapshot: { createdAt: Date } | null): RPOMetrics {
    let targetRPOHours = 24;
    if (policy === 'BUSINESS') targetRPOHours = 12;
    if (policy === 'ENTERPRISE') targetRPOHours = 1;

    if (!latestSnapshot) {
      return {
        tenantId,
        rpoPolicy: policy,
        targetRPOHours,
        currentRPOHours: 'INFINITE',
        lastSuccessfulBackup: null,
        status: 'RED'
      };
    }

    const msSinceBackup = Date.now() - latestSnapshot.createdAt.getTime();
    const currentRPOHours = msSinceBackup / (1000 * 60 * 60);

    let status: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
    if (currentRPOHours > targetRPOHours * 2) {
      status = 'RED'; // Severely breached
    } else if (currentRPOHours > targetRPOHours) {
      status = 'YELLOW'; // Warning, breaching
    }

    return {
      tenantId,
      rpoPolicy: policy,
      targetRPOHours,
      currentRPOHours,
      lastSuccessfulBackup: latestSnapshot.createdAt,
      status
    };
  }

  /**
   * Calculates the exact RPO metric and health status for a single tenant dynamically.
   */
  async calculateRPO(tenantId: string, policy: string = 'BASIC'): Promise<RPOMetrics> {
    const tenantPrisma = withTenant(tenantId);
    const latestSnapshot = await tenantPrisma.recoverySnapshot.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });

    return this.calculateRpoSync(tenantId, policy, latestSnapshot);
  }
}
