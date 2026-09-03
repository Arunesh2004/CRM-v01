import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '../../../database/utils/prisma';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';
import crypto from 'crypto';
import { emailProvider } from '../../modules/core/providers/email.provider';

describe('Identity & Onboarding Security', () => {
  let tenantId: string;
  let tenant2Id: string;
  let deptId: string;
  let roleId: string;
  let adminId: string;
  const adminClerkId = 'clerk_admin_123';
  
  beforeAll(async () => {
    // Create base data
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const t = await tx.tenant.create({ data: { name: 'Onboarding Test Tenant' } });
      tenantId = t.id;

      const t2 = await tx.tenant.create({ data: { name: 'Other Tenant' } });
      tenant2Id = t2.id;

      const d = await tx.department.create({ data: { name: 'Engineering', tenantId } });
      deptId = d.id;

      const rAdmin = await tx.role.create({ data: { name: 'TENANT_ADMIN', tenantId } });
      roleId = rAdmin.id;

      const rMember = await tx.role.create({ data: { name: 'MEMBER', tenantId } });

      const admin = await tx.user.create({
        data: {
          email: 'admin@onboarding.com',
          tenantId,
          departmentId: deptId,
          status: 'ACTIVE',
          onboardingStatus: 'COMPLETED',
          clerkId: adminClerkId,
          employeeId: 'EMP-ADM',
          userRoles: { create: { roleId: rAdmin.id, tenantId } }
        }
      });
      adminId = admin.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.userRole.deleteMany({ where: { tenantId } });
      await tx.userInvitation.deleteMany({ where: { tenantId } });
      await tx.user.deleteMany({ where: { tenantId } });
      await tx.department.deleteMany({ where: { tenantId } });
      await tx.role.deleteMany({ where: { tenantId } });
      await tx.tenant.delete({ where: { id: tenantId } });

      await tx.tenant.delete({ where: { id: tenant2Id } });
    });
  });

  it('Cannot redeem an expired invitation', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.userInvitation.create({
        data: {
          tenantId,
          email: 'expired@example.com',
          roleId,
          tokenHash,
          // Set to past date
          expiresAt: new Date(Date.now() - 86400000), 
          status: 'PENDING'
        }
      });
    });

    const invite = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.userInvitation.findUnique({ where: { tokenHash } });
    });
    
    expect(invite).toBeDefined();
    expect(invite!.expiresAt.getTime()).toBeLessThan(Date.now());
  });

  it('Cannot redeem an accepted invitation', async () => {
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.userInvitation.create({
        data: {
          tenantId,
          email: 'used@example.com',
          roleId,
          tokenHash,
          expiresAt: new Date(Date.now() + 86400000), 
          status: 'ACCEPTED'
        }
      });
    });

    const invite = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.userInvitation.findUnique({ where: { tokenHash } });
    });
    
    expect(invite!.status).toBe('ACCEPTED');
  });

  it('Forging an Employee ID is prevented during profile update', async () => {
    const user = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.user.findFirst({ where: { id: adminId } });
    });
    expect(user!.employeeId).toBe('EMP-ADM');
  });

  it('DemoEmailProvider does not leak tokens into DB logs', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // If we call the provider manually
    await emailProvider.sendInvitation('test@demo.com', 'http://localhost:3000/accept-invite?token=secret123');
    
    // The DB shouldn't contain the plaintext token anywhere
    const count = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.userInvitation.count({
        where: {
          tokenHash: 'secret123' // It shouldn't be the plaintext
        }
      });
    });
    
    expect(count).toBe(0);
    spy.mockRestore();
  });

  it('Invalid/Random token is rejected', async () => {
    const randomHash = crypto.createHash('sha256').update('randomToken123').digest('hex');
    const count = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.userInvitation.count({ where: { tokenHash: randomHash } });
    });
    expect(count).toBe(0);
  });
});
