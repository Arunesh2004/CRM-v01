import { User } from '@prisma/client';

/**
 * Validates department and role scope for operations like inviting or reassigning users.
 */
export function validateDepartmentScope(
  actorRoles: string[],
  actorDepartmentId: string | null,
  targetDepartmentId?: string | null,
  targetRoleName?: string
): { finalDepartmentId: string | undefined } {
  const isTenantAdmin = actorRoles.includes('TENANT_ADMIN') || actorRoles.includes('GLOBAL_ADMIN');
  const isDepartmentHead = actorRoles.includes('DEPARTMENT_HEAD');

  // Privilege escalation check
  if (!isTenantAdmin && targetRoleName === 'TENANT_ADMIN') {
    throw new Error('Forbidden: Only a TENANT_ADMIN can assign or invite the TENANT_ADMIN role.');
  }

  // If Tenant Admin, they can do whatever they want with departments
  if (isTenantAdmin) {
    return { finalDepartmentId: targetDepartmentId || undefined };
  }

  // If Department Head, restrict to their own department
  if (isDepartmentHead) {
    if (!actorDepartmentId) {
      throw new Error('Forbidden: You do not belong to a department to manage.');
    }
    
    // If they are targeting a specific department, it must be their own
    if (targetDepartmentId && targetDepartmentId !== actorDepartmentId) {
       throw new Error('Forbidden: You cannot manage employees outside your department.');
    }

    return { finalDepartmentId: actorDepartmentId };
  }

  return { finalDepartmentId: targetDepartmentId || undefined };
}
