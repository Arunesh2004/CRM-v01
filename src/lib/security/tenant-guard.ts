import prisma from '@/../database/utils/prisma';

/**
 * Asserts that the specified entity belongs to the given tenantId.
 * @param model The lowercase Prisma model name (e.g. 'location', 'camera')
 * @param id The entity ID
 * @param tenantId The current tenant ID
 */
export async function assertTenantOwnership(model: string, id: string, tenantId: string) {
  // @ts-ignore
  const entity = await prisma[model].findUnique({
    where: { id }
  });

  if (!entity) {
    throw new Error(`Security Violation: Entity ${model}:${id} not found.`);
  }

  if (entity.tenantId !== tenantId) {
    throw new Error(`Security Violation: Cross-tenant access denied for ${model}:${id}.`);
  }

  return entity;
}

/**
 * Asserts that a User belongs to the given tenant.
 */
export async function assertUserTenant(userId: string, tenantId: string) {
  return assertTenantOwnership('user', userId, tenantId);
}

/**
 * Validates multiple relationships simultaneously.
 */
export async function assertRelationOwnership(relations: { model: string, id: string }[], tenantId: string) {
  for (const rel of relations) {
    if (rel.id) {
      await assertTenantOwnership(rel.model, rel.id, tenantId);
    }
  }
}
