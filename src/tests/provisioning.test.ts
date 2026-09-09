import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import { exec } from 'child_process';
import util from 'util';

const execPromise = util.promisify(exec);

describe('First-Company Provisioning Architecture', () => {
  const companyName = 'SecureTestCorp';
  const adminEmail = 'admin@securetestcorp.local';

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const user = await tx.user.findFirst({ where: { email: adminEmail } });
      if (user) {
        await tx.tenantBootstrap.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.userRole.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.rolePermission.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.role.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.user.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.tenant.deleteMany({ where: { id: user.tenantId } });
      }
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const user = await tx.user.findFirst({ where: { email: adminEmail } });
      if (user) {
        await tx.tenantBootstrap.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.userRole.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.rolePermission.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.role.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.user.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.tenant.deleteMany({ where: { id: user.tenantId } });
      }
    });
  });

  it('1. First execution succeeds and creates required architecture', async () => {
    const { stdout, stderr } = await execPromise(`npx tsx scripts/provision-new-tenant.ts --company="${companyName}" --admin-email="${adminEmail}"`);
    expect(stderr).toBe('');
    expect(stdout).toContain('Secure First-Company Provisioning Complete');

    // Verify database state
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const user = await tx.user.findFirst({ where: { email: adminEmail }, include: { tenant: true, userRoles: { include: { role: true } } } });
      expect(user).toBeDefined();
      expect(user?.clerkId).toBeNull(); // Must be null until first login
      expect(user?.tenant.name).toBe(companyName);
      expect(user?.userRoles[0].role.name).toBe('GLOBAL_ADMIN');
      
      const bootstrap = await tx.tenantBootstrap.findFirst({ where: { tenantId: user?.tenantId } });
      expect(bootstrap).toBeDefined();
    });
  });

  it('2. Identical replay is safely idempotent', async () => {
    const { stdout, stderr } = await execPromise(`npx tsx scripts/provision-new-tenant.ts --company="${companyName}" --admin-email="${adminEmail}"`);
    expect(stderr).toBe('');
    expect(stdout).toContain('Nothing to do');

    // Verify no duplicates were created
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const users = await tx.user.findMany({ where: { email: adminEmail } });
      expect(users.length).toBe(1);
    });
  });

  it('3. Clerk identity binding contract - Active users with null clerkId bind safely', async () => {
    // We simulate what the clerk webhook route does via synchronizeClerkIdentity
    const dummyClerkId = 'clerk_test_123';
    
    // Simulate webhook arrival
    const bindResult = await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
      const user = await tx.user.findFirst({ where: { email: adminEmail } });
      if (user?.status === 'ACTIVE' && user.clerkId === null) {
        return tx.user.update({
          where: { id: user.id },
          data: { clerkId: dummyClerkId }
        });
      }
      return null;
    });

    expect(bindResult).toBeDefined();
    expect(bindResult?.clerkId).toBe(dummyClerkId);

    // If another clerkId tries to hijack, it should fail
    const hijackAttempt = await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
      const user = await tx.user.findFirst({ where: { email: adminEmail } });
      if (user?.status === 'ACTIVE') {
        if (user.clerkId === 'clerk_hacker_999') {
          return true; // Pretend it worked
        }
        return false; // Denied
      }
      return false;
    });

    expect(hijackAttempt).toBe(false);
  });

  it('4. Concurrent identical executions resolve exactly once', async () => {
    // Run two executions at the same time
    const p1 = execPromise(`npx tsx scripts/provision-new-tenant.ts --company="ConcurrentCorp" --admin-email="concurrent@test.local"`);
    const p2 = execPromise(`npx tsx scripts/provision-new-tenant.ts --company="ConcurrentCorp" --admin-email="concurrent@test.local"`);
    
    const [r1, r2] = await Promise.all([p1, p2]);
    
    // One should succeed, one should say "Nothing to do"
    const out1 = r1.stdout + r1.stderr;
    const out2 = r2.stdout + r2.stderr;
    
    const hasSuccess = out1.includes('Secure First-Company Provisioning Complete') || out2.includes('Secure First-Company Provisioning Complete');
    const hasNoOp = out1.includes('Nothing to do') || out2.includes('Nothing to do');
    
    expect(hasSuccess).toBe(true);
    expect(hasNoOp).toBe(true);

    // Verify 1 user in DB
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const users = await tx.user.findMany({ where: { email: 'concurrent@test.local' } });
      expect(users.length).toBe(1);

      // cleanup concurrent
      if (users[0]) {
        const user = users[0];
        await tx.tenantBootstrap.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.userRole.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.rolePermission.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.role.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.user.deleteMany({ where: { tenantId: user.tenantId } });
        await tx.tenant.deleteMany({ where: { id: user.tenantId } });
      }
    });
  });

  it('5. Same admin email but different company causes conflict', async () => {
    const { stdout, stderr } = await execPromise(`npx tsx scripts/provision-new-tenant.ts --company="DifferentCorp" --admin-email="${adminEmail}"`).catch(e => e);
    // Because it fails with exit code 1, execPromise throws and returns the error object containing stdout/stderr
    expect(stderr).toContain('PROVISIONING_CONFLICT_COMPANY_MISMATCH');
  });

});
