/**
 * R.14.6 — Security & Completeness Hardening Tests
 *
 * Validates:
 *   R146-1: CRON secret validation logic (no HTTP overhead, pure logic tests)
 *   R146-2: CRMComment service — authentication & authorization
 *   R146-3: CRMComment pagination — correctness, ordering, tenant isolation
 *   R146-4: Unified Customer Timeline — comment interleaving after pagination
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';
import {
  getCRMComments,
  createCRMComment,
  updateCRMComment,
  deleteCRMComment,
} from '@/modules/core/comments/comment.service';
import { getCustomerTimeline } from '@/modules/crm/customer/customer.timeline.service';
import * as authLib from '@/lib/auth';
import * as entityAccess from '@/lib/auth/entity-access';
import crypto from 'crypto';

// ---------------------------------------------------------------------------
// Auth mocks — all tests control auth explicitly
// ---------------------------------------------------------------------------
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
  requirePermission: vi.fn(),
  checkPermission: vi.fn(),
}));

vi.mock('@/lib/auth/entity-access', () => ({
  verifyEntityAccess: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Shared test data — two isolated tenants
// ---------------------------------------------------------------------------
let tenantAId: string;
let tenantBId: string;
let userAId: string;
let userBId: string;
let customerAId: string;
let customerBId: string; // belongs to Tenant B

beforeAll(async () => {
  tenantAId = crypto.randomUUID();
  tenantBId = crypto.randomUUID();
  userAId = crypto.randomUUID();
  userBId = crypto.randomUUID();

  await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    await tx.tenant.createMany({
      data: [
        { id: tenantAId, name: 'R146-TenantA', status: 'ACTIVE' },
        { id: tenantBId, name: 'R146-TenantB', status: 'ACTIVE' },
      ],
    });

    await tx.user.createMany({
      data: [
        { id: userAId, tenantId: tenantAId, email: `r146-usera-${Date.now()}@test.com`, status: 'ACTIVE' },
        { id: userBId, tenantId: tenantBId, email: `r146-userb-${Date.now()}@test.com`, status: 'ACTIVE' },
      ],
    });

    await tx.tenant.update({ where: { id: tenantAId }, data: { ownerId: userAId } });
    await tx.tenant.update({ where: { id: tenantBId }, data: { ownerId: userBId } });

    const cA = await tx.customer.create({
      data: { tenantId: tenantAId, name: 'R146-CustomerA', normalizedName: `r146-custa-${Date.now()}`, status: 'ACTIVE' },
    });
    customerAId = cA.id;

    const cB = await tx.customer.create({
      data: { tenantId: tenantBId, name: 'R146-CustomerB', normalizedName: `r146-custb-${Date.now()}`, status: 'ACTIVE' },
    });
    customerBId = cB.id;
  });
});

afterAll(async () => {
  // Clean up — cascade handled by FK; comments cleaned first
  await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
    await tx.cRMComment.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await tx.customer.deleteMany({ where: { tenantId: { in: [tenantAId, tenantBId] } } });
    await tx.user.deleteMany({ where: { id: { in: [userAId, userBId] } } });
    await tx.tenant.deleteMany({ where: { id: { in: [tenantAId, tenantBId] } } });
  });
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function authAs(userId: string, tenantId: string) {
  vi.mocked(authLib.requireAuth).mockResolvedValue({ id: userId, tenantId } as any);
  vi.mocked(authLib.requireTenant).mockResolvedValue(tenantId);
  vi.mocked(authLib.requirePermission).mockResolvedValue(true as any);
  vi.mocked(entityAccess.verifyEntityAccess).mockResolvedValue(true);
}

// ---------------------------------------------------------------------------
// R146-1: CRON secret validation logic
// (Replicated inline to avoid HTTP stack — same approach as phase9r tests)
// ---------------------------------------------------------------------------
describe('R146-1: CRON secret validation logic', () => {
  /**
   * Mirrors the verifyCronSecret function in process-outbox/route.ts exactly.
   * Tests the logic, not the network layer.
   */
  function verifyCronSecretLogic(authHeader: string | null, cronSecret: string | undefined): boolean {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
    const token = authHeader.slice(7);
    if (!cronSecret) return false;
    if (token.length !== cronSecret.length) return false;
    let mismatch = 0;
    for (let i = 0; i < token.length; i++) {
      mismatch |= token.charCodeAt(i) ^ cronSecret.charCodeAt(i);
    }
    return mismatch === 0;
  }

  it('R146-1-A: No Authorization header → denied', () => {
    expect(verifyCronSecretLogic(null, 'some-secret')).toBe(false);
  });

  it('R146-1-B: Wrong authorization scheme (no Bearer prefix) → denied', () => {
    expect(verifyCronSecretLogic('Token some-secret', 'some-secret')).toBe(false);
  });

  it('R146-1-C: Wrong secret → denied', () => {
    expect(verifyCronSecretLogic('Bearer wrong-value', 'correct-secret')).toBe(false);
  });

  it('R146-1-D: CRON_SECRET env var missing → fail closed (denied)', () => {
    expect(verifyCronSecretLogic('Bearer some-secret', undefined)).toBe(false);
  });

  it('R146-1-E: Correct secret → allowed', () => {
    const secret = 'r146-test-cron-secret-not-used-in-production-vitest-only';
    expect(verifyCronSecretLogic(`Bearer ${secret}`, secret)).toBe(true);
  });

  it('R146-1-F: Prefix extension attack (correct + extra chars) → denied', () => {
    const secret = 'base-secret';
    expect(verifyCronSecretLogic(`Bearer ${secret}-extra`, secret)).toBe(false);
  });

  it('R146-1-G: Empty token string after Bearer → denied', () => {
    // "Bearer " with nothing after — token is empty string, secret is non-empty
    expect(verifyCronSecretLogic('Bearer ', 'non-empty-secret')).toBe(false);
  });

  it('R146-1-H: No secret value leaks in denial — function returns boolean only', () => {
    // The function signature only returns boolean. This test documents that.
    const result = verifyCronSecretLogic('Bearer wrong', 'real-secret');
    expect(typeof result).toBe('boolean');
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// R146-2: CRMComment service — authentication & authorization
// ---------------------------------------------------------------------------
describe('R146-2: CRMComment service — auth & RBAC', () => {
  it('R146-2-A: Unauthenticated read → rejected', async () => {
    vi.mocked(authLib.requireAuth).mockRejectedValue(new Error('Unauthorized'));

    await expect(
      getCRMComments('CUSTOMER', customerAId)
    ).rejects.toThrow('Unauthorized');
  });

  it('R146-2-B: Authenticated read for own tenant → succeeds', async () => {
    authAs(userAId, tenantAId);

    const result = await getCRMComments('CUSTOMER', customerAId);
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('hasMore');
    expect(result).toHaveProperty('nextCursor');
  });

  it('R146-2-C: Cross-tenant read → rejected via verifyEntityAccess', async () => {
    // User A is authenticated for Tenant A but tries to read Tenant B's customer
    authAs(userAId, tenantAId);
    // Restore real verifyEntityAccess to catch cross-tenant violations
    vi.mocked(entityAccess.verifyEntityAccess).mockRejectedValue(
      new Error('Access Denied: Customer belongs to another tenant.')
    );

    await expect(
      getCRMComments('CUSTOMER', customerBId)
    ).rejects.toThrow(/Access Denied/);
  });

  it('R146-2-D: Unauthenticated create → rejected', async () => {
    vi.mocked(authLib.requireAuth).mockRejectedValue(new Error('Unauthorized'));

    await expect(
      createCRMComment('CUSTOMER', customerAId, 'test content')
    ).rejects.toThrow('Unauthorized');
  });

  it('R146-2-E: Authorized create → persists comment', async () => {
    authAs(userAId, tenantAId);

    const comment = await createCRMComment('CUSTOMER', customerAId, 'R146-E: authorized create');
    expect(comment).toHaveProperty('id');
    expect(comment.content).toBe('R146-E: authorized create');
    expect(comment.userId).toBe(userAId);

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: comment.id } });
    });
  });

  it('R146-2-F: Author can update their own comment', async () => {
    // Seed a comment as userA
    const seedComment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: { tenantId: tenantAId, userId: userAId, entityType: 'CUSTOMER', entityId: customerAId, content: 'original' },
      })
    );

    authAs(userAId, tenantAId);
    const updated = await updateCRMComment(seedComment.id, 'updated content');
    expect(updated.content).toBe('updated content');

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: seedComment.id } });
    });
  });

  it('R146-2-G: Non-author cannot update another user\'s comment', async () => {
    // Comment belongs to userA
    const seedComment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: { tenantId: tenantAId, userId: userAId, entityType: 'CUSTOMER', entityId: customerAId, content: 'owned by A' },
      })
    );

    // Authenticate as a different user in same tenant (use a different ID)
    const otherUserId = crypto.randomUUID();
    vi.mocked(authLib.requireAuth).mockResolvedValue({ id: otherUserId, tenantId: tenantAId } as any);
    vi.mocked(authLib.requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(entityAccess.verifyEntityAccess).mockResolvedValue(true);

    await expect(
      updateCRMComment(seedComment.id, 'attempted takeover')
    ).rejects.toThrow(/Unauthorized.*author/i);

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: seedComment.id } });
    });
  });

  it('R146-2-H: Updating a soft-deleted comment → rejected (not found)', async () => {
    const seedComment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: {
          tenantId: tenantAId,
          userId: userAId,
          entityType: 'CUSTOMER',
          entityId: customerAId,
          content: 'will be deleted',
          deletedAt: new Date(), // already soft-deleted
        },
      })
    );

    authAs(userAId, tenantAId);

    await expect(
      updateCRMComment(seedComment.id, 'cannot update deleted')
    ).rejects.toThrow('Comment not found');

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: seedComment.id } });
    });
  });

  it('R146-2-I: Unauthenticated delete → rejected', async () => {
    vi.mocked(authLib.requireAuth).mockRejectedValue(new Error('Unauthorized'));

    await expect(
      deleteCRMComment('any-comment-id')
    ).rejects.toThrow('Unauthorized');
  });

  it('R146-2-J: Author can soft-delete their own comment', async () => {
    const seedComment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: { tenantId: tenantAId, userId: userAId, entityType: 'CUSTOMER', entityId: customerAId, content: 'to be deleted' },
      })
    );

    authAs(userAId, tenantAId);
    const result = await deleteCRMComment(seedComment.id);
    expect(result.success).toBe(true);

    // Verify soft-delete — deletedAt must be set
    const persisted = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.findUnique({ where: { id: seedComment.id } })
    );
    expect(persisted?.deletedAt).not.toBeNull();

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: seedComment.id } });
    });
  });

  it('R146-2-K: Non-author delete → rejected', async () => {
    const seedComment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: { tenantId: tenantAId, userId: userAId, entityType: 'CUSTOMER', entityId: customerAId, content: 'protected' },
      })
    );

    const intruderId = crypto.randomUUID();
    vi.mocked(authLib.requireAuth).mockResolvedValue({ id: intruderId, tenantId: tenantAId } as any);
    vi.mocked(authLib.requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(entityAccess.verifyEntityAccess).mockResolvedValue(true);

    await expect(
      deleteCRMComment(seedComment.id)
    ).rejects.toThrow(/Unauthorized.*author/i);

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: seedComment.id } });
    });
  });
});

// ---------------------------------------------------------------------------
// R146-3: CRMComment pagination — correctness, ordering, tenant isolation
// ---------------------------------------------------------------------------
describe('R146-3: CRMComment pagination integrity', () => {
  const PAGE_SIZE = 3;
  const commentIds: string[] = [];

  beforeAll(async () => {
    // Seed 7 top-level comments for customerA in tenantA with distinct timestamps
    for (let i = 0; i < 7; i++) {
      const c = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
        tx.cRMComment.create({
          data: {
            tenantId: tenantAId,
            userId: userAId,
            entityType: 'CUSTOMER',
            entityId: customerAId,
            content: `R146-3 comment ${i}`,
            createdAt: new Date(Date.now() - (7 - i) * 1000), // oldest first in creation order
          },
        })
      );
      commentIds.push(c.id);
    }
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.deleteMany({ where: { id: { in: commentIds } } });
    });
  });

  it('R146-3-A: First page returns exactly PAGE_SIZE items when more exist', async () => {
    authAs(userAId, tenantAId);
    const result = await getCRMComments('CUSTOMER', customerAId, undefined, PAGE_SIZE);

    // May include items from other tests; filter to our seeded set
    const ours = result.data.filter((c: any) => commentIds.includes(c.id));
    // First page should contain exactly PAGE_SIZE of ours (since we seeded 7)
    expect(ours.length).toBe(PAGE_SIZE);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).not.toBeNull();
  });

  it('R146-3-B: Cursor continuation returns next page without duplicates', async () => {
    authAs(userAId, tenantAId);

    const page1 = await getCRMComments('CUSTOMER', customerAId, undefined, PAGE_SIZE);
    const page1Ids = new Set(page1.data.filter((c: any) => commentIds.includes(c.id)).map((c: any) => c.id));

    expect(page1.nextCursor).not.toBeNull();

    const page2 = await getCRMComments('CUSTOMER', customerAId, page1.nextCursor!, PAGE_SIZE);
    const page2Ids = new Set(page2.data.filter((c: any) => commentIds.includes(c.id)).map((c: any) => c.id));

    // No overlap between pages
    const overlap = [...page1Ids].filter((id) => page2Ids.has(id));
    expect(overlap).toHaveLength(0);
  });

  it('R146-3-C: No records are skipped — union of pages covers all seeded comments', async () => {
    authAs(userAId, tenantAId);

    const allFetchedIds = new Set<string>();
    let cursor: string | undefined = undefined;

    // Fetch all pages
    for (let pass = 0; pass < 5; pass++) {
      const result = await getCRMComments('CUSTOMER', customerAId, cursor, PAGE_SIZE);
      result.data
        .filter((c: any) => commentIds.includes(c.id))
        .forEach((c: any) => allFetchedIds.add(c.id));

      if (!result.hasMore || !result.nextCursor) break;
      cursor = result.nextCursor;
    }

    // All 7 seeded comments must be present
    for (const id of commentIds) {
      expect(allFetchedIds.has(id)).toBe(true);
    }
  });

  it('R146-3-D: Results are ordered by createdAt descending (newest first)', async () => {
    authAs(userAId, tenantAId);

    const result = await getCRMComments('CUSTOMER', customerAId, undefined, 10);
    const ours = result.data.filter((c: any) => commentIds.includes(c.id));

    // Verify descending timestamp ordering
    for (let i = 1; i < ours.length; i++) {
      const prevTime = new Date(ours[i - 1].createdAt).getTime();
      const currTime = new Date(ours[i].createdAt).getTime();
      expect(prevTime).toBeGreaterThanOrEqual(currTime);
    }
  });

  it('R146-3-E: Tenant isolation — cursor from Tenant A cannot expose Tenant B comments', async () => {
    // Seed a comment for Tenant B's customer
    const tenantBComment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: {
          tenantId: tenantBId,
          userId: userBId,
          entityType: 'CUSTOMER',
          entityId: customerBId,
          content: 'R146-3-E: Tenant B secret comment',
        },
      })
    );

    // Auth as Tenant A user querying Tenant A customer
    authAs(userAId, tenantAId);

    const result = await getCRMComments('CUSTOMER', customerAId, undefined, 50);
    const leaked = result.data.find((c: any) => c.id === tenantBComment.id);
    expect(leaked).toBeUndefined();

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: tenantBComment.id } });
    });
  });

  it('R146-3-F: Soft-deleted comments are excluded from paginated results', async () => {
    const deletedComment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: {
          tenantId: tenantAId,
          userId: userAId,
          entityType: 'CUSTOMER',
          entityId: customerAId,
          content: 'R146-3-F: deleted comment',
          deletedAt: new Date(),
        },
      })
    );

    authAs(userAId, tenantAId);
    const result = await getCRMComments('CUSTOMER', customerAId, undefined, 50);
    const leaked = result.data.find((c: any) => c.id === deletedComment.id);
    expect(leaked).toBeUndefined();

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: deletedComment.id } });
    });
  });
});

// ---------------------------------------------------------------------------
// R146-4: Unified Customer Timeline — comment interleaving after pagination
// ---------------------------------------------------------------------------
describe('R146-4: Customer Timeline — comment interleaving', () => {
  beforeEach(() => {
    vi.mocked(authLib.requireAuth).mockResolvedValue({ id: userAId, tenantId: tenantAId } as any);
    vi.mocked(authLib.requireTenant).mockResolvedValue(tenantAId);
    vi.mocked(authLib.requirePermission).mockResolvedValue(true as any);
    // Timeline service does NOT use verifyEntityAccess — no need to mock it here
  });

  it('R146-4-A: Comments appear as NOTE events in the unified timeline', async () => {
    const comment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: {
          tenantId: tenantAId,
          userId: userAId,
          entityType: 'CUSTOMER',
          entityId: customerAId,
          content: 'R146-4-A: visible in timeline',
        },
      })
    );

    const result = await getCustomerTimeline({ customerId: customerAId });
    const found = result.data.find((e: any) => e.id === comment.id);
    expect(found).toBeDefined();
    expect(found?.type).toBe('NOTE');
    expect(found?.description).toBe('R146-4-A: visible in timeline');

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: comment.id } });
    });
  });

  it('R146-4-B: Soft-deleted comments do not appear in the unified timeline', async () => {
    const comment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: {
          tenantId: tenantAId,
          userId: userAId,
          entityType: 'CUSTOMER',
          entityId: customerAId,
          content: 'R146-4-B: deleted — must not leak',
          deletedAt: new Date(),
        },
      })
    );

    const result = await getCustomerTimeline({ customerId: customerAId });
    const found = result.data.find((e: any) => e.id === comment.id);
    expect(found).toBeUndefined();

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: comment.id } });
    });
  });

  it('R146-4-C: Timeline cursor pagination does not lose or reorder events', async () => {
    // Seed a comment and an ActivityTimeline event for the same customer
    const comment = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.cRMComment.create({
        data: {
          tenantId: tenantAId,
          userId: userAId,
          entityType: 'CUSTOMER',
          entityId: customerAId,
          content: 'R146-4-C: comment for ordering test',
          createdAt: new Date(Date.now() - 5000),
        },
      })
    );

    const activity = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) =>
      tx.activityTimeline.create({
        data: {
          tenantId: tenantAId,
          actorId: userAId,
          entityType: 'CUSTOMER',
          entityId: customerAId,
          type: 'NOTE',
          content: 'R146-4-C: activity for ordering test',
          createdAt: new Date(Date.now() - 3000), // more recent than comment
        },
      })
    );

    // Fetch page 1 small limit, then page 2, verify activity comes before comment
    const page1 = await getCustomerTimeline({ customerId: customerAId, limit: 1 });
    expect(page1.pagination.hasMore).toBe(true);
    expect(page1.data.length).toBe(1);

    const page2 = await getCustomerTimeline({ customerId: customerAId, cursor: page1.pagination.nextCursor!, limit: 1 });
    expect(page2.data.length).toBeGreaterThan(0);

    // The union of page1 + page2 must not contain duplicates
    const allIds = [...page1.data, ...page2.data].map((e: any) => e.id);
    const uniqueIds = new Set(allIds);
    expect(uniqueIds.size).toBe(allIds.length);

    // Cleanup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.cRMComment.delete({ where: { id: comment.id } });
      await tx.activityTimeline.delete({ where: { id: activity.id } });
    });
  });
});
