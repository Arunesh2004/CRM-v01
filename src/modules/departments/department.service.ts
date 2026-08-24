import prisma from '@db/utils/prisma';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { createAuditLog } from '../audit/audit.service';

export async function getDepartments() {
  await requireAuth();
  const tenantId = await requireTenant();
  
  // Everyone can view departments in the company
  return await prisma.department.findMany({
    where: { tenantId },
    include: {
      _count: {
        select: { users: true }
      }
    },
    orderBy: { name: 'asc' }
  });
}

export async function createDepartment(name: string, description?: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('SYSTEM', 'CREATE'); // Or 'DEPARTMENT' if we had a specific resource

  let isTenantAdmin = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
  }

  if (!isTenantAdmin) {
    throw new Error('Only TENANT_ADMIN can create departments.');
  }

  const dept = await prisma.department.create({
    data: {
      name,
      description,
      tenantId
    }
  });

  await createAuditLog({
    tenantId,
    actorId: actor.id,
    action: 'DEPARTMENT_CREATED',
    resource: 'DEPARTMENT',
    resourceId: dept.id,
    metadata: { name }
  });

  return dept;
}

export async function updateDepartment(departmentId: string, name: string, description?: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('SYSTEM', 'UPDATE');

  let isTenantAdmin = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
  }

  if (!isTenantAdmin) {
    throw new Error('Only TENANT_ADMIN can update departments.');
  }

  const dept = await prisma.department.update({
    where: { id: departmentId, tenantId },
    data: { name, description }
  });

  await createAuditLog({
    tenantId,
    actorId: actor.id,
    action: 'DEPARTMENT_UPDATED',
    resource: 'DEPARTMENT',
    resourceId: dept.id,
  });

  return dept;
}

// Soft Delete concept: we don't actually delete departments. 
// We just throw an error if they try, or maybe we don't expose a delete action at all.
// The spec says "Soft delete only. Never destroy historical relationships."
// Since Prisma schema for Department doesn't have a `deletedAt` field, we either:
// 1) Add a `deletedAt` or `status` field via migration (forbidden by current prompt context "Do not duplicate... Create migrations only if required." but wait, it said "Before migration: Audit existing schema... Create migrations only if required. Migration must be reversible, safe, production compatible.")
// Actually, I won't implement department deletion UI for now. If needed, I will just throw an error.
export async function deleteDepartment(departmentId: string) {
  throw new Error("Department deletion is disabled to preserve historical relationships.");
}
