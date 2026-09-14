import { getCustomerTimeline } from '@/modules/crm/customer/customer.timeline.service';
import prisma from '@db/utils/prisma';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Mock auth dependencies
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
  requireTenant: vi.fn(),
  requirePermission: vi.fn(),
}));

import { withTenant } from '@db/utils/prisma-tenant';

// Use standard Prisma Client for test setup
describe('Customer Timeline Service', () => {
  let tenantId: string;
  let customerId: string;
  let userId: string;
  let otherCustomerId: string;

  beforeAll(async () => {
    // Generate isolated tenant for tests
    const tenant = await prisma.tenant.create({
      data: { name: 'Timeline Test Tenant' }
    });
    tenantId = tenant.id;

    const tenantPrisma = withTenant(tenantId);

    // Create user
    const user = await tenantPrisma.user.create({
      data: {
        tenantId,
        email: `tester-${Date.now()}@example.com`,
        firstName: 'Test',
        lastName: 'User',
      }
    });
    userId = user.id;

    // Create customers
    const customer = await tenantPrisma.customer.create({
      data: { tenantId, name: 'Main Customer', normalizedName: 'main customer' }
    });
    customerId = customer.id;

    const otherCustomer = await tenantPrisma.customer.create({
      data: { tenantId, name: 'Other Customer', normalizedName: 'other customer' }
    });
    otherCustomerId = otherCustomer.id;
  });

  afterAll(async () => {
    // Clean up
    const tenantPrisma = withTenant(tenantId);
    await tenantPrisma.cRMComment.deleteMany({ where: { tenantId } });
    await tenantPrisma.customer.deleteMany({ where: { tenantId } });
    await tenantPrisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    const auth = await import('@/lib/auth');
    (auth.requireAuth as any).mockResolvedValue({ id: userId, tenantId });
    (auth.requireTenant as any).mockResolvedValue(tenantId);
    (auth.requirePermission as any).mockResolvedValue(true);
  });

  afterEach(async () => {
    const tenantPrisma = withTenant(tenantId);
    await tenantPrisma.cRMComment.deleteMany({ where: { tenantId } });
  });

  it('should include CRMComments in the customer timeline', async () => {
    // Arrange
    const tenantPrisma = withTenant(tenantId);
    await tenantPrisma.cRMComment.create({
      data: {
        tenantId,
        userId,
        entityType: 'CUSTOMER',
        entityId: customerId,
        content: 'This is a test comment on the customer',
      }
    });

    // Act
    const result = await getCustomerTimeline({ customerId });

    // Assert
    expect(result.data.length).toBeGreaterThan(0);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentEvent = result.data.find((e: any) => e.description === 'This is a test comment on the customer');
    expect(commentEvent).toBeDefined();
    expect(commentEvent?.type).toBe('NOTE');
  });

  it('should exclude CRMComments from other customers', async () => {
    // Arrange
    const tenantPrisma = withTenant(tenantId);
    await tenantPrisma.cRMComment.create({
      data: {
        tenantId,
        userId,
        entityType: 'CUSTOMER',
        entityId: otherCustomerId, // Different customer
        content: 'This comment belongs to another customer',
      }
    });

    // Act
    const result = await getCustomerTimeline({ customerId });

    // Assert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentEvent = result.data.find((e: any) => e.description === 'This comment belongs to another customer');
    expect(commentEvent).toBeUndefined();
  });

  it('should exclude CRMComments with deletedAt set (soft deleted)', async () => {
    // Arrange
    const tenantPrisma = withTenant(tenantId);
    await tenantPrisma.cRMComment.create({
      data: {
        tenantId,
        userId,
        entityType: 'CUSTOMER',
        entityId: customerId,
        content: 'This is a deleted comment',
        deletedAt: new Date(),
      }
    });

    // Act
    const result = await getCustomerTimeline({ customerId });

    // Assert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentEvent = result.data.find((e: any) => e.description === 'This is a deleted comment');
    expect(commentEvent).toBeUndefined();
  });

  it('should exclude CRMComments for other entities (e.g. LEAD) with the same ID', async () => {
    // Arrange
    const tenantPrisma = withTenant(tenantId);
    await tenantPrisma.cRMComment.create({
      data: {
        tenantId,
        userId,
        entityType: 'LEAD', // Different entity type, same ID
        entityId: customerId,
        content: 'This comment belongs to a lead with a colliding ID',
      }
    });

    // Act
    const result = await getCustomerTimeline({ customerId });

    // Assert
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commentEvent = result.data.find((e: any) => e.description === 'This comment belongs to a lead with a colliding ID');
    expect(commentEvent).toBeUndefined();
  });

  it('should sort timeline events deterministically (timestamp descending, then id ascending)', async () => {
    // Arrange: Create events with the exact same timestamp
    const now = new Date();
    const tenantPrisma = withTenant(tenantId);
    
    await tenantPrisma.cRMComment.create({
      data: {
        id: 'comment-1', // lexicographically smaller
        tenantId,
        userId,
        entityType: 'CUSTOMER',
        entityId: customerId,
        content: 'First comment',
        createdAt: now,
      }
    });

    await tenantPrisma.cRMComment.create({
      data: {
        id: 'comment-2', // lexicographically larger
        tenantId,
        userId,
        entityType: 'CUSTOMER',
        entityId: customerId,
        content: 'Second comment',
        createdAt: now,
      }
    });

    // Act
    const result = await getCustomerTimeline({ customerId });

    // Assert
    // Filter out only our test comments for precise checking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const comments = result.data.filter((e: any) => e.id.startsWith('comment-'));
    expect(comments.length).toBe(2);
    // Since timestamp diff is 0, it falls back to a.id.localeCompare(b.id)
    // So comment-1 should come first.
    expect(comments[0].id).toBe('comment-1');
    expect(comments[1].id).toBe('comment-2');
  });
});
