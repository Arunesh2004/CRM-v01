import prisma from './prisma';

/**
 * PHASE 26E FAST-PATH HELPER: Customer Export
 * 
 * WHY THIS BYPASSES `withTenant`:
 * The global `withTenant` Prisma extension intercepts $allOperations across 53 models.
 * For high-throughput read paths like `/api/export`, this adds ~877ms of CPU-bound overhead 
 * locally, inflating to >2s on Vercel Serverless.
 * 
 * SECURITY INVARIANT PRESERVATION:
 * This helper does NOT expose generic Prisma `options: any`. 
 * It mechanically enforces `tenantId: trustedTenantId` internally, completely overwriting 
 * any accidental or malicious tenant selection. It only exposes `startDate` and `endDate` parameters.
 * 
 * Do NOT use this as a template to bypass `withTenant` globally. 
 */
export async function getTenantCustomersForExport(trustedTenantId: string, startDate?: Date, endDate?: Date) {
  if (!trustedTenantId) {
    throw new Error('Trusted tenantId is required for fast export path');
  }

  // Preserve the exact semantic filters from the original getCustomersCsv implementation
  const dateFilter = startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {};

  // Mechanically force the tenantId.
  return prisma.customer.findMany({
    where: {
      tenantId: trustedTenantId, // FORCED INTERNALLY
      ...dateFilter
    },
    orderBy: { createdAt: 'desc' }
  });
}

/**
 * PHASE 26E FAST-PATH HELPER: Customer Creation (Write Path)
 * 
 * SECURITY INVARIANT PRESERVATION:
 * 1. tenantId MUST come from the authenticated identity (trustedTenantId), NEVER from payload.
 * 2. It mechanically overrides the database insert's tenantId, preventing cross-tenant writes.
 * 3. Includes AuditLog and ActivityTimeline inserts in the same transaction to preserve atomicity.
 * 4. Bypasses the CPU-heavy `withTenant` global $extends interceptor.
 */
export async function createTenantCustomerFast(
  trustedTenantId: string, 
  actorId: string, 
  customerData: { name: string; industry?: string; assignedUserId?: string }
) {
  if (!trustedTenantId) throw new Error('Trusted tenantId is required for fast write path');
  if (!actorId) throw new Error('Trusted actorId is required for fast write path');

  const normalizedName = customerData.name.toLowerCase().trim().replace(/\s+/g, ' ');

  const startDup = performance.now();
  const existing = await prisma.customer.findFirst({ 
    where: { tenantId: trustedTenantId, normalizedName, deletedAt: null } 
  });
  console.log(`[PHASE_26E_MEASUREMENT] Duplicate check duration: ${(performance.now() - startDup).toFixed(2)}ms`);
  
  if (existing) throw new Error('A customer with this name already exists.');

  const startTx = performance.now();
  return await prisma.$transaction(async (tx) => {
    console.log(`[PHASE_26E_MEASUREMENT] Transaction acquired after: ${(performance.now() - startTx).toFixed(2)}ms`);
    
    const startInsert = performance.now();
    const customer = await tx.customer.create({
      data: {
        name: customerData.name,
        normalizedName,
        industry: customerData.industry,
        assignedUserId: customerData.assignedUserId,
        tenantId: trustedTenantId,
      }
    });
    console.log(`[PHASE_26E_MEASUREMENT] Customer insert duration: ${(performance.now() - startInsert).toFixed(2)}ms`);

    const startAudit = performance.now();
    await tx.auditLog.create({
      data: {
        tenantId: trustedTenantId,
        actorId,
        actorType: 'USER',
        action: 'CUSTOMER_CREATED',
        resource: 'CUSTOMER',
        resourceId: customer.id,
      }
    });
    console.log(`[PHASE_26E_MEASUREMENT] Audit insert duration: ${(performance.now() - startAudit).toFixed(2)}ms`);

    const startTimeline = performance.now();
    await tx.activityTimeline.create({
      data: {
        tenantId: trustedTenantId,
        type: 'SYSTEM',
        content: `Customer created: ${customer.name}`,
        actorId,
        entityType: 'CUSTOMER',
        entityId: customer.id
      }
    });
    const timings = {
      dupCheck: (startTx - startDup).toFixed(2),
      txAcquire: (startInsert - startTx).toFixed(2),
      customerInsert: (startAudit - startInsert).toFixed(2),
      auditInsert: (startTimeline - startAudit).toFixed(2),
      timelineInsert: (performance.now() - startTimeline).toFixed(2)
    };
    return { customer, timings };
  });
}
