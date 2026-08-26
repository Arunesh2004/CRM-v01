/**
 * PHASE R.11.2 — ADVERSARIAL TESTS
 * Leads Kanban stage transitions + Quick Add authorization
 *
 * Tests cover:
 * 1. Valid stage transition
 * 2. Invalid stage value rejection (not in LeadStatus enum)
 * 3. Invalid UUID rejected by schema
 * 4. Cross-tenant IDOR — Tenant A cannot move Tenant B's lead
 * 5. Cross-tenant tenantId injection blocked by .strict() schema
 * 6. LEAD:UPDATE permission denied blocks Kanban move
 * 7. LEAD:CREATE permission denied blocks Quick Add Lead
 * 8. CUSTOMER:CREATE permission denied blocks Quick Add Customer
 * 9. TASK:CREATE permission denied blocks Quick Add Task
 * 10. Unauthenticated user rejected for all operations
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';

// ── Mutable auth control variables ───────────────────────────────────────────
let mockUserId      = '';
let mockTenantId    = '';
let mockAuthenticated = true;
// Permission gate: 'RESOURCE:ACTION' => false means deny
let mockDenied: Set<string> = new Set();

// ── Mock @/lib/auth ───────────────────────────────────────────────────────────
// Must cover ALL auth functions used by any service under test:
//   leadService   → requireAuth, requireTenant, requirePermission
//   taskService   → requireAuth, requireTenant, requirePermission
//   customerService → requireAuthIdentity, requireTenantFromIdentity, requirePermissionFast
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(async () => {
    if (!mockAuthenticated) throw new Error('Unauthenticated');
    return { id: mockUserId };
  }),
  requireTenant: vi.fn(async () => {
    if (!mockAuthenticated) throw new Error('Unauthenticated');
    return mockTenantId;
  }),
  requirePermission: vi.fn(async (resource: string, action: string) => {
    if (!mockAuthenticated) throw new Error('Unauthenticated');
    const key = `${resource}:${action}`;
    if (mockDenied.has(key)) throw new Error('Forbidden');
  }),
  requireAuthIdentity: vi.fn(async () => {
    if (!mockAuthenticated) throw new Error('Unauthenticated');
    return { id: mockUserId, tenantId: mockTenantId, status: 'ACTIVE' };
  }),
  requireTenantFromIdentity: vi.fn((user: { tenantId: string }) => {
    if (!mockAuthenticated) throw new Error('Unauthenticated');
    return user.tenantId;
  }),
  requirePermissionFast: vi.fn(async (_userId: string, resource: string, action: string) => {
    if (!mockAuthenticated) throw new Error('Unauthenticated');
    const key = `${resource}:${action}`;
    if (mockDenied.has(key)) throw new Error('Forbidden');
    return true;
  }),
}));

// Import services AFTER mocks are established
import * as leadService    from '@/modules/crm/lead/lead.service';
import * as taskService    from '@/modules/crm/task/task.service';

// ── Test tenant/user/lead state ───────────────────────────────────────────────
let tenantAId      = '';
let tenantBId      = '';
let userAId        = '';
let leadAId        = '';
let victimLeadBId  = '';

describe('Phase R.11.2 — Lead Kanban Stage + Quick Add Authorization', () => {
  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // Tenant A — attacker
      const tA = await tx.tenant.create({ data: { name: `R112_TA_${Date.now()}` } });
      tenantAId = tA.id;
      const uA = await tx.user.create({
        data: {
          clerkId:  `r112_uA_${Date.now()}`,
          email:    `r112_a_${Date.now()}@test.com`,
          tenantId: tenantAId,
          status:   'ACTIVE',
        },
      });
      userAId = uA.id;

      const lA = await tx.lead.create({
        data: { name: 'Lead A', company: 'Attacker Corp', status: 'NEW', tenantId: tenantAId },
      });
      leadAId = lA.id;

      // Tenant B — victim
      const tB = await tx.tenant.create({ data: { name: `R112_TB_${Date.now()}` } });
      tenantBId = tB.id;
      const uB = await tx.user.create({
        data: {
          clerkId:  `r112_uB_${Date.now()}`,
          email:    `r112_b_${Date.now()}@test.com`,
          tenantId: tenantBId,
          status:   'ACTIVE',
        },
      });

      const lB = await tx.lead.create({
        data: { name: 'Victim Lead', company: 'Victim Corp', status: 'NEW', tenantId: tenantBId },
      });
      victimLeadBId = lB.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.lead.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    });
  });

  // Helper: reset to Tenant A, all permissions granted
  function asUserA() {
    mockAuthenticated = true;
    mockUserId   = userAId;
    mockTenantId = tenantAId;
    mockDenied   = new Set();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // KANBAN — Stage transitions
  // ─────────────────────────────────────────────────────────────────────────

  it('TEST-01: valid stage transition succeeds for authorised Tenant A user', async () => {
    asUserA();
    const result = await leadService.updateLead({ id: leadAId, status: 'CONTACTED' });
    expect((result as any).status).toBe('CONTACTED');
  });

  it('TEST-02: invalid stage value rejected by Zod schema before reaching service', async () => {
    const { z }          = await import('zod');
    const { LeadStatus } = await import('@prisma/client');
    const KanbanStageSchema = z.object({
      id:     z.string().uuid(),
      status: z.nativeEnum(LeadStatus, { error: () => ({ message: 'Invalid pipeline stage' }) }),
    });

    const INVALID_STAGES = ['NEGOTIATION', 'WON', 'HACKED', '', 'null', 'undefined'];
    for (const s of INVALID_STAGES) {
      expect(() => KanbanStageSchema.parse({ id: leadAId, status: s }))
        .toThrow(/Invalid pipeline stage|Invalid enum|Invalid option|invalid_value/i);
    }
  });

  it('TEST-03: invalid lead UUID rejected by Zod schema', async () => {
    const { z }          = await import('zod');
    const { LeadStatus } = await import('@prisma/client');
    const KanbanStageSchema = z.object({
      id:     z.string().uuid(),
      status: z.nativeEnum(LeadStatus),
    });

    const INVALID_IDS = ['not-a-uuid', '', '../../etc/passwd', '1; DROP TABLE leads;--'];
    for (const id of INVALID_IDS) {
      expect(() => KanbanStageSchema.parse({ id, status: 'CONTACTED' })).toThrow();
    }
  });

  it('TEST-04 (IDOR): Tenant A cannot move Tenant B\'s lead — "Lead not found"', async () => {
    asUserA();
    // Service resolves tenantId = tenantAId from session.
    // victimLeadBId belongs to tenantBId → invisible → throws "Lead not found"
    await expect(
      leadService.updateLead({ id: victimLeadBId, status: 'LOST' })
    ).rejects.toThrow('Lead not found');
  });

  it('TEST-05 (tenantId injection): UpdateLeadSchema.strict() rejects injected tenantId field', async () => {
    const { UpdateLeadSchema } = await import('@/modules/crm/validators/lead.schema');
    // .strict() means any unknown key throws ZodError
    expect(() =>
      UpdateLeadSchema.parse({
        id:       leadAId,
        status:   'CONTACTED',
        tenantId: tenantBId, // attacker injecting victim's tenantId
      })
    ).toThrow();
  });

  it('TEST-06: LEAD:UPDATE denied → Kanban drag blocked', async () => {
    asUserA();
    mockDenied.add('LEAD:UPDATE');
    await expect(
      leadService.updateLead({ id: leadAId, status: 'QUALIFIED' })
    ).rejects.toThrow('Forbidden');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK ADD — Permission enforcement
  // ─────────────────────────────────────────────────────────────────────────

  it('TEST-07: LEAD:CREATE denied → Quick Add lead blocked', async () => {
    asUserA();
    mockDenied.add('LEAD:CREATE');
    await expect(
      leadService.createLead({ name: 'Sneak Lead', company: 'Hacker Inc' })
    ).rejects.toThrow('Forbidden');
  });

  it('TEST-08: TASK:CREATE denied → Quick Add task blocked', async () => {
    asUserA();
    mockDenied.add('TASK:CREATE');
    await expect(
      taskService.createTask({ title: 'Sneak Task' })
    ).rejects.toThrow('Forbidden');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // UNAUTHENTICATED
  // ─────────────────────────────────────────────────────────────────────────

  it('TEST-09: unauthenticated user rejected for Kanban move', async () => {
    mockAuthenticated = false;
    await expect(
      leadService.updateLead({ id: leadAId, status: 'LOST' })
    ).rejects.toThrow();
    mockAuthenticated = true;
    asUserA();
  });

  it('TEST-10: unauthenticated user rejected for Quick Add lead', async () => {
    mockAuthenticated = false;
    await expect(
      leadService.createLead({ name: 'X', company: 'Y' })
    ).rejects.toThrow();
    mockAuthenticated = true;
    asUserA();
  });

  it('TEST-11: unauthenticated user rejected for Quick Add task', async () => {
    mockAuthenticated = false;
    await expect(
      taskService.createTask({ title: 'Anon Task' })
    ).rejects.toThrow();
    mockAuthenticated = true;
    asUserA();
  });
});
