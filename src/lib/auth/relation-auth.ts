// src/lib/auth/relation-auth.ts

/**
 * Supported models that belong to a tenant and can be safely queried for relation ownership.
 * Must exactly match the Prisma client property names (e.g. 'customer', 'location').
 */
export type TenantScopedModel = 
  | 'customer'
  | 'location'
  | 'deal'
  | 'lead'
  | 'ticket'
  | 'task'
  | 'camera'
  | 'pipeline'
  | 'document'
  | 'meeting'
  | 'territory'
  | 'user'
  | 'aIEvent';

/**
 * Enforces that all supplied relation IDs belong to the current tenant.
 * MUST be called inside the same database transaction as the subsequent mutation.
 * 
 * @param tx Prisma transaction client
 * @param tenantId The current tenant ID
 * @param relations Object mapping the Prisma model name to the relation ID(s) to check
 * 
 * @throws Error if any supplied ID does not exist or belongs to another tenant.
 */
export async function requireRelationOwnership(
  tx: any,
  tenantId: string,
  relations: Partial<Record<TenantScopedModel, string | string[] | undefined | null>>
): Promise<void> {
  for (const [model, ids] of Object.entries(relations)) {
    if (!ids) continue; // Optional relation omitted
    
    const idArray = Array.isArray(ids) ? ids : [ids];
    if (idArray.length === 0) continue;

    const validCount = await tx[model as TenantScopedModel].count({
      where: {
        id: { in: idArray },
        tenantId,
        // We assume soft-deleted parents might still be valid for historical records 
        // unless explicitly specified, but typically we shouldn't link to deleted records.
        deletedAt: null
      }
    });

    if (validCount !== idArray.length) {
      // Intentionally obscure the error to avoid leaking existence of cross-tenant records
      throw new Error(`Invalid or unauthorized reference provided for ${model}.`);
    }
  }
}
