import { describe, it, expect, beforeEach, afterEach, vi, MockInstance } from 'vitest';
import { enforceDemoSafetyGuard } from '../../../scripts/utils/demo-safety';
import { runBootstrapDemo } from '../../../scripts/bootstrap-demo';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';

describe('S16 Client Demo Provisioning', () => {
  const originalEnv = process.env;
  let errorMock: MockInstance;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.spyOn(process, 'exit').mockImplementation(((code?: number | string | null | undefined) => {
      throw new Error(`Process exited with code ${code}`);
    }) as unknown as never);
    errorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Production Safety Guard', () => {
    it('should fail closed if NODE_ENV is production', () => {
      process.env.NODE_ENV = 'production';
      expect(() => enforceDemoSafetyGuard()).toThrow('Process exited with code 1');
      expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('Cannot run demo scripts in a Production environment'));
    });

    it('should fail closed if VERCEL_ENV is production', () => {
      process.env.VERCEL_ENV = 'production';
      expect(() => enforceDemoSafetyGuard()).toThrow('Process exited with code 1');
    });

    it('should fail closed if DATABASE_URL is missing', () => {
      delete process.env.DATABASE_URL;
      expect(() => enforceDemoSafetyGuard()).toThrow('Process exited with code 1');
      expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('DATABASE_URL is not set'));
    });

    it('should fail closed for known production hosts in DATABASE_URL', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@db.neon.tech/main';
      expect(() => enforceDemoSafetyGuard()).toThrow('Process exited with code 1');
      expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('contains known production host'));
    });

    it('should fail closed for ambiguous/unknown hosts', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@some-random-host.com/main';
      expect(() => enforceDemoSafetyGuard()).toThrow('Process exited with code 1');
      expect(errorMock).toHaveBeenCalledWith(expect.stringContaining('is ambiguous or not explicitly approved'));
    });

    it('should allow known safe local/E2E hosts', () => {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/main';
      expect(() => enforceDemoSafetyGuard()).not.toThrow();
    });
  });

  describe('2. Deterministic Identity & Role Provisioning', () => {
    it('should provision a demo tenant, role, and strictly exact permission matrix', async () => {
      // Simulate args
      const testEmail = `test-demo-${Date.now()}@company.com`;
      process.argv = ['node', 'script.js', '--company=Test CRM Demo', `--email=${testEmail}`, '--name=Test User'];
      
      // Prevent actual exit if successful
      await expect(runBootstrapDemo()).resolves.not.toThrow();

      // Verify the tenant and user were created
      await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
        const user = await tx.user.findFirst({ where: { email: testEmail }, include: { tenant: true } });
        expect(user).toBeDefined();
        expect(user!.tenant.name).toBe('Test CRM Demo');
        expect(user!.tenant.ownerId).toBe(user!.id);

        // Verify role
        const demoRole = await tx.role.findFirst({ where: { tenantId: user!.tenantId, name: 'DEMO_USER' }, include: { permissions: { include: { permission: true } } } });
        expect(demoRole).toBeDefined();

        // Verify explicitly allowed matrix
        const allowedResources = ['CUSTOMER', 'LEAD', 'REVENUE', 'TICKET', 'TASK', 'COMMUNICATION', 'INCIDENT'];
        const allowedActions = ['CREATE', 'READ', 'UPDATE', 'DELETE'];
        
        for (const res of allowedResources) {
          for (const act of allowedActions) {
            const hasPerm = demoRole!.permissions.some(rp => rp.permission.resource === res && rp.permission.action === act);
            expect(hasPerm).toBe(true);
          }
        }

        // Verify Camera read
        const hasCamRead = demoRole!.permissions.some(rp => rp.permission.resource === 'CAMERA' && rp.permission.action === 'READ');
        expect(hasCamRead).toBe(true);

        // Verify restricted matrix (Defense in depth)
        const restrictedResources = ['SYSTEM', 'USER'];
        for (const res of restrictedResources) {
          const hasRestricted = demoRole!.permissions.some(rp => rp.permission.resource === res);
          expect(hasRestricted).toBe(false);
        }
      });
    }, 20000);

    it('should be safe to rerun and safely recover (Idempotency)', async () => {
      const testEmail = `recovery-demo-${Date.now()}@company.com`;
      process.argv = ['node', 'script.js', '--company=Recovery Demo', `--email=${testEmail}`, '--name=Test User'];
      
      await runBootstrapDemo(); // First run

      // Fetch the state
      await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
        const initialUsersCount = await tx.user.count({ where: { email: testEmail } });
        expect(initialUsersCount).toBe(1);

        const user = await tx.user.findFirst({ where: { email: testEmail }, include: { tenant: true } });
        const tenantId = user!.tenantId;

        const initialCustomerCount = await tx.customer.count({ where: { tenantId } });

        // Run again
        await runBootstrapDemo(); 

        const postUsersCount = await tx.user.count({ where: { email: testEmail } });
        expect(postUsersCount).toBe(1); // Did not duplicate user

        const postCustomerCount = await tx.customer.count({ where: { tenantId } });
        expect(postCustomerCount).toBe(initialCustomerCount); // Did not duplicate customers
      });
    }, 40000);

    it('should fail safely if an existing email belongs to an unexpected tenant', async () => {
      const hijackEmail = `hijack-${Date.now()}@other.com`;
      
      // Create a totally unrelated tenant/user
      await executeAsSystem(SystemOperation.DEMO_SEED, async (tx) => {
        const otherTenant = await tx.tenant.create({ data: { name: 'Other Corp' } });
        await tx.user.create({
          data: {
            email: hijackEmail,
            clerkId: `clerk_${Date.now()}`,
            tenantId: otherTenant.id,
            status: 'ACTIVE'
          }
        });
      });

      // Try to bootstrap demo using that email
      process.argv = ['node', 'script.js', '--company=Demo Corp', `--email=${hijackEmail}`];
      
      // Should fail safely
      let errorThrown = false;
      try {
        await runBootstrapDemo();
      } catch (e: unknown) {
        errorThrown = true;
        if (e instanceof Error) {
          expect(e.message).toContain('Aborting to prevent takeover');
        }
      }
      expect(errorThrown).toBe(true);
    }, 10000);
  });
});
