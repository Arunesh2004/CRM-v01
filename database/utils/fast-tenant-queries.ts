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
