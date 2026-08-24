import { prismaAdmin } from '@db/utils/prisma';

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
    const tenants = await prismaAdmin.tenant.findMany({
      where: { status: { not: 'DELETED' } },
      select: { id: true, rpoPolicy: true }
    });

    const metrics: RPOMetrics[] = [];
    for (const tenant of tenants) {
      metrics.push(await this.calculateRPO(tenant.id, tenant.rpoPolicy));
    }
    return metrics;
  }

  /**
   * Calculates the exact RPO metric and health status for a single tenant.
   */
  async calculateRPO(tenantId: string, policy: string = 'BASIC'): Promise<RPOMetrics> {
    // Map policy to hours
    let targetRPOHours = 24;
    if (policy === 'BUSINESS') targetRPOHours = 12;
    if (policy === 'ENTERPRISE') targetRPOHours = 1;

    // Get the most recent successful snapshot
    const latestSnapshot = await prismaAdmin.recoverySnapshot.findFirst({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });

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
}
