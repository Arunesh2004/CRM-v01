import prisma from '@/../database/utils/prisma';
import { withTenant } from '@/../database/utils/prisma-tenant';
import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { clerkClient } from '@clerk/nextjs/server';

import { EventBus } from '../core/events/event-bus';

export async function getEmployees(search?: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  
  // Only owners/admins should manage employees, but members can view them (read permission)
  await requirePermission('USER', 'READ');

  const prisma = withTenant(tenantId);

  const where: any = { 
    tenantId, 
    clerkId: { not: { startsWith: 'SYSTEM_' } }
  };

  if (search) {
    where.email = { contains: search, mode: 'insensitive' };
  }

  return await prisma.user.findMany({
    where,
    include: {
      userRoles: {
        include: { role: true }
      }
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
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: actor.id,
      actorType: 'USER',
      action: 'USER_INVITED',
      resource: 'USER',
      resourceId: newUser.id,
      metadata: { email, roleName, departmentId: finalDepartmentId }
    }
  });

  return invitation;
}

export async function removeEmployee(userId: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'DELETE');

  const userToRemove = await prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null }
  });

  if (!userToRemove) {
    throw new Error('User not found in this tenant.');
  }

  if (userToRemove.id === actor.id) {
    throw new Error('You cannot remove yourself.');
  }

  // Soft delete in our DB
  await prisma.user.update({
    where: { id: userId },
    data: { deletedAt: new Date(), status: 'INACTIVE' }
  });

  // Remove from Clerk (optional depending on if the user belongs to multiple tenants, 
  // but in our isolated SaaS model, we can just delete the Clerk identity or strip their metadata)
  if (userToRemove.clerkId) {
    const client = await clerkClient();
    await client.users.deleteUser(userToRemove.clerkId);
  }

  // Log Audit
  await prisma.auditLog.create({
    data: {
      tenantId,
      actorId: actor.id,
      actorType: 'USER',
      action: 'USER_DELETED',
      resource: 'USER',
      resourceId: userId,
    }
  });

  return { success: true };
}

export async function updateEmployeeRole(userId: string, newRoleName: string) {
  const actor = await requireAuth();
  const tenantId = await requireTenant();
  
  await requirePermission('USER', 'UPDATE');

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

    // Log Audit
    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: actor.id,
        actorType: 'USER',
        action: 'USER_ROLE_UPDATED',
        resource: 'USER',
        resourceId: userId,
        metadata: { newRole: newRoleName }
      }
    });
  });

  return { success: true };
}
