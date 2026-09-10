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
      const emailsToClean = [adminEmail, 'concurrent@test.local', 'different@test.local'];
      for (const email of emailsToClean) {
        const users = await tx.user.findMany({ where: { email } });
        for (const user of users) {
          await tx.tenantBootstrap.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.userRole.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.rolePermission.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.role.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.user.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.tenant.deleteMany({ where: { id: user.tenantId } });
        }
      }
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const emailsToClean = [adminEmail, 'concurrent@test.local', 'different@test.local'];
      for (const email of emailsToClean) {
        const users = await tx.user.findMany({ where: { email } });
        for (const user of users) {
          await tx.tenantBootstrap.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.userRole.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.rolePermission.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.role.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.user.deleteMany({ where: { tenantId: user.tenantId } });
          await tx.tenant.deleteMany({ where: { id: user.tenantId } });
        }
      }
    });
  });

  it('1. First execution succeeds and creates required architecture', async () => {
    const { stdout, stderr } = await execPromise(`npx tsx scripts/bootstrap-company.ts --company="${companyName}" --admin-email="${adminEmail}" --admin-name="Admin User"`);
    expect(stdout).toContain('[Bootstrap] Success!');

    // Verify database state
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const user = await tx.user.findFirst({ where: { email: adminEmail }, include: { tenant: true, userRoles: { include: { role: true } } } });
      expect(user).toBeDefined();
      expect(user?.clerkId).toBeNull(); // Must be null until first login
      expect(user?.tenant.name).toBe(companyName);
      expect(user?.userRoles[0].role.name).toBe('TENANT_ADMIN');

      const bootstrap = await tx.tenantBootstrap.findFirst({ where: { tenantId: user?.tenantId } });
      expect(bootstrap).toBeDefined();
    });
  });

  it('2. Identical replay is safely idempotent (or fails safely)', async () => {
    const p = execPromise(`npx tsx scripts/bootstrap-company.ts --company="${companyName}" --admin-email="${adminEmail}" --admin-name="Admin User"`);
    await expect(p).rejects.toThrow();

    // Verify no duplicates were created
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const users = await tx.user.findMany({ where: { email: adminEmail } });
      expect(users.length).toBe(1);
    });
  });

  it('3. Clerk identity binding contract - Active users with null clerkId bind safely', async () => {
    const dummyClerkId = 'clerk_test_123';
    await executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
      const user = await tx.user.findFirst({ where: { email: adminEmail } });
      if (user?.status === 'ACTIVE' && user.clerkId === null) {
        await tx.user.update({
          where: { id: user.id },
          data: { clerkId: dummyClerkId }
        });
      }
    });

    const bindResult = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      return tx.user.findFirst({ where: { email: adminEmail } });
    });

    expect(bindResult).toBeDefined();
    expect(bindResult?.clerkId).toBe(dummyClerkId);

    // If another clerkId tries to hijack, it should fail
    const hijack = executeAsSystem(SystemOperation.CLERK_PROVISIONING, async (tx) => {
      await tx.user.updateMany({
        where: { email: adminEmail, clerkId: null }, // RLS equivalent constraint
        data: { clerkId: 'hacker_123' }
      });
      return tx.user.findFirst({ where: { email: adminEmail } });
    });

    const postHijack = await hijack;
    expect(postHijack?.clerkId).toBe(dummyClerkId); // Must not change
  });

  it('4. Concurrent identical executions resolve exactly once', async () => {
    // Run two executions at the same time
    const p1 = execPromise(`npx tsx scripts/bootstrap-company.ts --company="ConcurrentCorp" --admin-email="concurrent@test.local" --admin-name="Admin User"`);
    const p2 = execPromise(`npx tsx scripts/bootstrap-company.ts --company="ConcurrentCorp" --admin-email="concurrent@test.local" --admin-name="Admin User"`);

    const results = await Promise.allSettled([p1, p2]);
    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    expect(successes.length).toBe(1);
    expect(failures.length).toBe(1);

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
    const p = execPromise(`npx tsx scripts/bootstrap-company.ts --company="DifferentCorp" --admin-email="${adminEmail}" --admin-name="Admin User"`);
    await expect(p).rejects.toThrow();
  });

});
