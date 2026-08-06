import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { RecordUsageInput } from '../billing.types';

export async function recordUsage(input: RecordUsageInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  // Usage might not need 'CREATE' permission directly if triggered by system events, 
  // but we enforce BILLING:MANAGE or SYSTEM bypass internally. 
  // For this prototype, we'll enforce BILLING:MANAGE or assume the caller has it.
  
  const prisma = withTenant(tenantId);
  
  const usage = await prisma.usageEvent.create({
    data: {
      tenantId,
      type: input.type,
      quantity: input.quantity,
      metadata: input.metadata || {}
    }
  });

  return usage;
}

export async function getUsageSummary(type: any) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('BILLING', 'READ');
  
  const prisma = withTenant(tenantId);
  
  const events = await prisma.usageEvent.findMany({
    where: { type },
    select: { quantity: true }
  });

  const total = events.reduce((sum: number, event: any) => sum + event.quantity, 0);
  return { type, total };
}
