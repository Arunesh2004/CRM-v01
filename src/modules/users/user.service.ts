import prisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission, invalidateUserCache } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';

import { EventBus } from '../core/events/event-bus';
import globalPrisma from '@db/utils/prisma';
import { validateDepartmentScope } from '../security/abac/department-scope';
import { emailProvider } from '../core/providers/email.provider';
import crypto from 'crypto';
import { Logger } from '@/lib/logger/logger';

export async function getEmployees(filters?: { search?: string, departmentId?: string, roleName?: string, status?: string }) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  // Only owners/admins should manage employees, but members can view them (read permission)
  await requirePermission('USER', 'READ');

  const prisma = withTenant(tenantId);

  const where: any = { 
    tenantId, 
    clerkId: { not: { startsWith: 'SYSTEM_' } },
    deletedAt: null // Never show hard-deleted
  };

  // Role Based Visibility
  let isTenantAdmin = false;
  let isDepartmentHead = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
    if (ur.role.name === 'DEPARTMENT_HEAD') isDepartmentHead = true;
  }

  if (!isTenantAdmin && isDepartmentHead) {
    // Dept Head only sees their department
    if (!actor.departmentId) {
       return []; // If they have no department, they see nothing
    }
    where.departmentId = actor.departmentId;
  } else if (!isTenantAdmin && !isDepartmentHead) {
    // MEMBER sees all allowed employees, but without sensitive fields (handled in UI mapping)
    // No specific database-level filter needed for members to view the directory
  }

  if (filters?.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
      { employeeId: { contains: filters.search, mode: 'insensitive' } },
    ];
  }
  
  if (filters?.departmentId) {
    // If Dept Head, they can't override their own department filter (handled by the if block above)
    if (isTenantAdmin) {
       where.departmentId = filters.departmentId;
    }
  }

  if (filters?.roleName) {
    where.userRoles = { some: { role: { name: filters.roleName } } };
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  const users = await prisma.user.findMany({
    where,
    include: {
      userRoles: {
        include: { role: true }
      },
      department: true
    },
    orderBy: { createdAt: 'desc' }
  });

  return users.map(u => ({
    ...u,
    phone: u.id === actor.id ? u.phone : null,
    // Add virtual callerId for frontend consistency
    callerId: `${u.firstName || ''} ${u.lastName || ''} - ${u.employeeId || 'UNKNOWN'}`.trim()
  }));
}

async function generateEmployeeId(tenantId: string): Promise<string> {
  const crypto = require('crypto');
  let empId = '';
  let exists = true;
  while (exists) {
    empId = `EMP-${crypto.randomBytes(3).toString('hex').toUpperCase()}`; // 6 hex chars
    const count = await prisma.user.count({ where: { employeeId: empId, tenantId } });
    if (count === 0) exists = false;
  }
  return empId;
}

export async function inviteEmployee(emailStr: string, roleName: string = 'MEMBER', requestedDepartmentId?: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'CREATE');
  
  const email = emailStr.toLowerCase().trim();

  // Role and Department Authorization
  const actorRoleNames = actor.userRoles.map((ur: any) => ur.role.name);
  const { finalDepartmentId } = validateDepartmentScope(
    actorRoleNames,
    actor.departmentId,
    requestedDepartmentId,
    roleName
  );

  // Use tenant-scoped client so app.current_tenant_id is set for all RLS-enforced lookups
  const tenantPrisma = withTenant(tenantId);

  // Ensure department belongs to tenant if provided
  if (finalDepartmentId) {
    const dept = await tenantPrisma.department.findFirst({
      where: { id: finalDepartmentId, tenantId }
    });
    if (!dept) throw new Error('Invalid department');
  }

  // Verify Role exists in Tenant
  const role = await tenantPrisma.role.findFirst({
    where: { name: roleName, tenantId }
  });

  if (!role) {
    throw new Error(`Role ${roleName} does not exist for this tenant.`);
  }

  const empId = await generateEmployeeId(tenantId);

  // Generate cryptographic token for invitation
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // This will fail safely if email is not unique
  const newUser = await tenantPrisma.user.create({
    data: {
      email,
      employeeId: empId,
      tenantId,
      departmentId: finalDepartmentId,
      status: 'INVITED',
      onboardingStatus: 'PENDING',
      userRoles: {
        create: { roleId: role.id, tenantId }
      }
    }
  });
  
  // Create our secure UserInvitation
  await tenantPrisma.userInvitation.create({
    data: {
      tenantId,
      email,
      roleId: role.id,
      departmentId: finalDepartmentId,
      tokenHash,
      expiresAt,
      invitedById: actor.id,
    }
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const inviteUrl = `${appUrl}/accept-invite?token=${token}`;

  await emailProvider.sendInvitation(email, inviteUrl, { roleName });

  // Log Audit
  const { createAuditLog } = await import('../audit/audit.service');
  await createAuditLog({
    tenantId,
    actorId: actor.id,
    action: 'EMPLOYEE_INVITED',
    resource: 'USER',
    resourceId: newUser.id,
    metadata: { email, roleName, departmentId: finalDepartmentId }
  });

  return { success: true, email };
}

export async function disableEmployee(userId: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'DELETE');

  const prismaTenant = withTenant(tenantId);

  const userToRemove = await prismaTenant.user.findFirst({
    where: { id: userId, tenantId },
    include: { userRoles: { include: { role: true } } }
  });

  if (!userToRemove) {
    throw new Error('User not found in this tenant.');
  }

  // Hierarchy and Department Check
  const actorRoleNames = actor.userRoles.map((ur: any) => ur.role.name);
  const targetRoleNames = userToRemove.userRoles.map((ur: any) => ur.role.name);
  const isActorGlobal = actorRoleNames.includes('GLOBAL_ADMIN');
  const isActorTenantAdmin = actorRoleNames.includes('TENANT_ADMIN');
  const isActorDeptHead = actorRoleNames.includes('DEPARTMENT_HEAD');

  const isTargetGlobal = targetRoleNames.includes('GLOBAL_ADMIN');
  const isTargetTenantAdmin = targetRoleNames.includes('TENANT_ADMIN');
  const isTargetDeptHead = targetRoleNames.includes('DEPARTMENT_HEAD');

  if (!isActorGlobal) {
    if (isTargetGlobal || (isTargetTenantAdmin && !isActorTenantAdmin) || (isTargetDeptHead && !isActorTenantAdmin && !isActorGlobal)) {
      throw new Error('Forbidden: Cannot disable a user with equal or higher privileges.');
    }
    
    if (isActorDeptHead && !isActorTenantAdmin) {
      if (!actor.departmentId) {
        throw new Error('Forbidden: You do not belong to a department to manage.');
      }
      if (userToRemove.departmentId !== actor.departmentId) {
        throw new Error('Forbidden: You cannot manage employees outside your department.');
      }
    }
  }

  if (userToRemove.id === actor.id) {
    throw new Error('You cannot disable yourself.');
  }

  // Soft disable in our DB
  await prismaTenant.user.update({
    where: { id: userId },
    data: { status: 'INACTIVE' }
  });

  // Remove from Clerk identity (forces logout/blocks login)
  if (userToRemove.clerkId) {
    const client = await clerkClient();
    try {
      await client.users.deleteUser(userToRemove.clerkId);
      await invalidateUserCache(userToRemove.clerkId);
    } catch (e) {
      Logger.warn("Failed to delete Clerk user or already deleted:", e);
    }
  }

  // Log Audit using the new service format
  const { createAuditLog } = await import('../audit/audit.service');
  await createAuditLog({
    tenantId,
    actorId: actor.id,
    action: 'EMPLOYEE_DISABLED',
    resource: 'USER',
    resourceId: userId,
  });

  return { success: true };
}

export async function updateEmployeeRole(userId: string, newRoleName: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'UPDATE');

  // RBAC checks
  let isTenantAdmin = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
  }

  if (!isTenantAdmin) {
    throw new Error("Only TENANT_ADMIN can change roles.");
  }

  const tenantPrisma = withTenant(tenantId);

  const userToUpdate = await tenantPrisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null }
  });

  if (!userToUpdate) {
    throw new Error('User not found in this tenant.');
  }

  const role = await tenantPrisma.role.findFirst({
    where: { name: newRoleName, tenantId }
  });

  if (!role) {
    throw new Error(`Role ${newRoleName} does not exist for this tenant.`);
  }

  // Transaction to update role
  await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    // Delete existing roles
    await tx.userRole.deleteMany({
      where: { userId }
    });

    // Assign new role
    await tx.userRole.create({
      data: {
        userId,
        roleId: role.id,
        tenantId
      }
    });
  });
  
  // Log Audit
  const { createAuditLog } = await import('../audit/audit.service');
  await createAuditLog({
    tenantId,
    actorId: actor.id,
    action: 'ROLE_CHANGED',
    resource: 'USER',
    resourceId: userId,
    metadata: { newRole: newRoleName }
  });

  if (userToUpdate.clerkId) {
    await invalidateUserCache(userToUpdate.clerkId);
  }

  return { success: true };
}

export async function reassignDepartment(userId: string, newDepartmentId: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'UPDATE');

  const userToUpdate = await prisma.user.findFirst({
    where: { id: userId, tenantId }
  });

  if (!userToUpdate) {
    throw new Error('User not found in this tenant.');
  }

  // Role and Department Authorization
  const actorRoleNames = actor.userRoles.map((ur: any) => ur.role.name);
  const { finalDepartmentId } = validateDepartmentScope(
    actorRoleNames,
    actor.departmentId,
    newDepartmentId
  );
  
  if (!finalDepartmentId) {
    throw new Error("Invalid department target.");
  }

  const isDepartmentHead = actorRoleNames.includes('DEPARTMENT_HEAD');
  const isTenantAdmin = actorRoleNames.includes('TENANT_ADMIN') || actorRoleNames.includes('GLOBAL_ADMIN');

  if (isDepartmentHead && !isTenantAdmin) {
    if (userToUpdate.departmentId !== actor.departmentId) {
      throw new Error("You can only reassign employees within your own department.");
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { departmentId: newDepartmentId }
  });

  const { createAuditLog } = await import('../audit/audit.service');
  await createAuditLog({
    tenantId,
    actorId: actor.id,
    action: 'DEPARTMENT_CHANGED',
    resource: 'USER',
    resourceId: userId,
    metadata: { newDepartmentId }
  });

  if (userToUpdate.clerkId) {
    await invalidateUserCache(userToUpdate.clerkId);
  }
  
  return { success: true };
}

export async function updateProfile(userId: string, data: { firstName?: string, lastName?: string, phone?: string, designation?: string, profilePhotoUrl?: string }) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();

  // Employee can edit their own profile, or Tenant Admin can edit. Dept Head cannot edit other's profiles based on rules ("Employee: Can edit own profile. Dept Head: Can view. Admin: Can manage all.")
  let isTenantAdmin = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
  }

  if (actor.id !== userId && !isTenantAdmin) {
    throw new Error("You do not have permission to edit this profile.");
  }

  await prisma.user.update({
    where: { id: userId, tenantId },
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      designation: data.designation,
      profilePhotoUrl: data.profilePhotoUrl
    }
  });

  const { createAuditLog } = await import('../audit/audit.service');
  await createAuditLog({
    tenantId,
    actorId: actor.id,
    action: 'PROFILE_UPDATED',
    resource: 'USER',
    resourceId: userId,
    metadata: { updatedFields: Object.keys(data).filter(k => (data as any)[k] !== undefined) }
  });

  return { success: true };
}
