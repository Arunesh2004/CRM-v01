import { describe, it, expect, vi } from 'vitest';
import { getInvoicesAction } from '../../modules/billing/actions/billing.actions';
import { BillingService } from '../../modules/billing/billing.service';
import { Prisma } from '@prisma/client';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn().mockResolvedValue({ id: 'test-user-id' }),
  requireTenant: vi.fn().mockResolvedValue('test-tenant-id'),
  requirePermission: vi.fn().mockResolvedValue(true),
}));

vi.mock('../../modules/billing/billing.service', () => ({
  BillingService: {
    getInvoices: vi.fn(),
  },
}));

describe('getInvoicesAction Serialization', () => {
  it('should serialize Prisma.Decimal values into strings', async () => {
    // Arrange
    const mockInvoices = [
      {
        id: 'inv-123',
        tenantId: 'test-tenant-id',
        amountDue: new Prisma.Decimal('150.5000'),
        amountPaid: new Prisma.Decimal('100.0000'),
        status: 'OPEN',
      },
    ];
    vi.mocked(BillingService.getInvoices).mockResolvedValue(mockInvoices as any);

    // Act
    const result = await getInvoicesAction();

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(Array.isArray(result.data)).toBe(true);
    
    const invoice = (result.data as any)[0];
    expect(typeof invoice.amountDue).toBe('string');
    expect(invoice.amountDue).toBe('150.5'); // Decimal.toString() drops trailing zeros on the right side if exact
    expect(typeof invoice.amountPaid).toBe('string');
    expect(invoice.amountPaid).toBe('100');
  });
});
