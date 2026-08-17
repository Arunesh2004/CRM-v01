import prisma from '@/../database/utils/prisma';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';

import { EventBus } from '../core/events/event-bus';

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

  return await prisma.user.findMany({
    where,
    include: {
      userRoles: {
        include: { role: true }
      },
      department: true
    },
    orderBy: { createdAt: 'desc' }
  });
}

export async function inviteEmployee(emailStr: string, roleName: string = 'MEMBER', requestedDepartmentId?: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'CREATE');
  
  const email = emailStr.toLowerCase().trim();

  // Role and Department Authorization
  let isTenantAdmin = false;
  let isDepartmentHead = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
    if (ur.role.name === 'DEPARTMENT_HEAD') isDepartmentHead = true;
  }

  let finalDepartmentId = requestedDepartmentId;

  if (isDepartmentHead && !isTenantAdmin) {
    if (!actor.departmentId) {
      throw new Error('You do not belong to a department to manage.');
    }
    finalDepartmentId = actor.departmentId; // Force their own department
  }

  // Ensure department belongs to tenant if provided
  if (finalDepartmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: finalDepartmentId, tenantId }
    });
    if (!dept) throw new Error('Invalid department');
  }

  // Verify Role exists in Tenant
  const role = await prisma.role.findFirst({
    where: { name: roleName, tenantId }
  });

  if (!role) {
    throw new Error(`Role ${roleName} does not exist for this tenant.`);
  }

  // Create local user first
  const crypto = require('crypto');
  const empId = `EMP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // This will fail safely if email is not unique
  const newUser = await prisma.user.create({
    data: {
      email,
      employeeId: empId,
      tenantId,
      departmentId: finalDepartmentId,
      status: 'INVITED',
      onboardingStatus: 'PENDING',
      userRoles: {
        create: { roleId: role.id }
      }
    }
  });

  const client = await clerkClient();
  
  // Create Clerk Invitation
  const invitation = await client.invitations.createInvitation({
    emailAddress: email,
    publicMetadata: {
      tenantId,
      roleName
    }
  });

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

  return invitation;
}

export async function disableEmployee(userId: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'DELETE');

  const userToRemove = await prisma.user.findFirst({
    where: { id: userId, tenantId }
  });

  if (!userToRemove) {
    throw new Error('User not found in this tenant.');
  }

  if (userToRemove.id === actor.id) {
    throw new Error('You cannot disable yourself.');
  }

  // Soft disable in our DB
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'INACTIVE' }
  });

  // Remove from Clerk identity (forces logout/blocks login)
  if (userToRemove.clerkId) {
    const client = await clerkClient();
    try {
      await client.users.deleteUser(userToRemove.clerkId);
    } catch (e) {
      console.warn("Failed to delete Clerk user or already deleted:", e);
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

  const userToUpdate = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null }
  });

  if (!userToUpdate) {
    throw new Error('User not found in this tenant.');
  }

  const role = await prisma.role.findFirst({
    where: { name: newRoleName, tenantId }
  });

  if (!role) {
    throw new Error(`Role ${newRoleName} does not exist for this tenant.`);
  }

  // Transaction to update role
  await prisma.$transaction(async (tx) => {
    // Delete existing roles
    await tx.userRole.deleteMany({
      where: { userId }
    });

    // Assign new role
    await tx.userRole.create({
      data: {
        userId,
        roleId: role.id
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

  return { success: true };
}

export async function reassignDepartment(userId: string, newDepartmentId: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'UPDATE');

  let isTenantAdmin = false;
  let isDepartmentHead = false;
  for (const ur of actor.userRoles) {
    if (ur.role.name === 'TENANT_ADMIN') isTenantAdmin = true;
    if (ur.role.name === 'DEPARTMENT_HEAD') isDepartmentHead = true;
  }

  if (!isTenantAdmin && !isDepartmentHead) {
    throw new Error("You do not have permission to reassign departments.");
  }

  const userToUpdate = await prisma.user.findFirst({
    where: { id: userId, tenantId }
  });

  if (!userToUpdate) {
    throw new Error('User not found.');
  }

  // Department Head restriction
  if (isDepartmentHead && !isTenantAdmin) {
    if (userToUpdate.departmentId !== actor.departmentId) {
      throw new Error("You can only reassign employees within your own department.");
    }
    if (newDepartmentId !== actor.departmentId) {
      throw new Error("You cannot move employees outside your department.");
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
