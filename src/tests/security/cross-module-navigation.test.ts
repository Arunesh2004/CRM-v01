import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authLib from '@/lib/auth';
import { globalSearch } from '@/modules/search/search.service';
import { PrismaClient } from '@prisma/client';
import { withTenant } from '@db/utils/prisma-tenant';

const mockTenantId = 'tenant-123';
const mockUserId = 'user-123';

// Mock dependencies
vi.mock('@/lib/auth', () => ({
  checkPermissionFast: vi.fn(),
}));

vi.mock('@db/utils/prisma-tenant', () => ({
  withTenant: vi.fn(),
}));

describe('Cross-Module Navigation & Search Route Regression', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('generates correct canonical URLs for search results', async () => {
    // 1. Setup Auth Mocks
    vi.spyOn(authLib, 'checkPermissionFast').mockResolvedValue(true);

    // 2. Setup DB Mocks
    const mockPrisma = {
      customer: { findMany: vi.fn().mockResolvedValue([{ id: 'cust-1', name: 'Cust A', industry: 'Tech' }]) },
      lead: { findMany: vi.fn().mockResolvedValue([{ id: 'lead-1', name: 'Lead A', company: 'Comp A' }]) },
      task: { findMany: vi.fn().mockResolvedValue([{ id: 'task-1', title: 'Task A', status: 'PENDING' }]) },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'emp-1', email: 'emp@test.com' }]) },
      mailMessage: { findMany: vi.fn().mockResolvedValue([{ id: 'msg-1', threadId: 'thread-1', bodyText: 'Hello', sender: { email: 'test@test.com' } }]) },
      chatMessage: { findMany: vi.fn().mockResolvedValue([{ id: 'cmsg-1', conversationId: 'conv-1', content: 'Chat', sender: { email: 'chat@test.com' } }]) },
      invoice: { findMany: vi.fn().mockResolvedValue([{ id: 'inv-1', status: 'PAID', amountDue: 100 }]) },
    };
    vi.mocked(withTenant).mockReturnValue(mockPrisma as any);

    // 3. Execute Search
    const results = await globalSearch(mockTenantId, 'query', mockUserId);

    // 4. Verify canonical navigation routes
    const leadResult = results.find(r => r.type === 'LEAD');
    expect(leadResult?.url).toBe('/leads/lead-1'); // Verified Lead Route

    const taskResult = results.find(r => r.type === 'TASK');
    expect(taskResult?.url).toBe('/tasks/task-1'); // Verified Task Route

    const empResult = results.find(r => r.type === 'EMPLOYEE');
    expect(empResult?.url).toBe('/employees/emp-1'); // Verified Employee Route

    const custResult = results.find(r => r.type === 'CUSTOMER');
    expect(custResult?.url).toBe('/customers/cust-1'); // Verified Customer Route

    const invoiceResult = results.find(r => r.type === 'INVOICE');
    expect(invoiceResult?.url).toBe('/billing/invoices'); // Verified Invoice Route

    const mailResult = results.find(r => r.type === 'MESSAGE' && r.url.includes('mail'));
    expect(mailResult?.url).toBe('/communication/mail/thread-1'); // Verified Mail Thread Route

    const chatResult = results.find(r => r.type === 'MESSAGE' && r.url.includes('chat'));
    expect(chatResult?.url).toBe('/communication/chat/conv-1'); // Verified Chat Conversation Route
  });

  it('respects backend authorization boundaries and does not leak routes', async () => {
    // 1. Setup Auth Mocks - user only has permission for tasks and leads
    vi.spyOn(authLib, 'checkPermissionFast').mockImplementation(async (uid, resource) => {
      if (resource === 'TASK' || resource === 'LEAD') return true;
      return false;
    });

    const mockPrisma = {
      customer: { findMany: vi.fn() },
      lead: { findMany: vi.fn().mockResolvedValue([{ id: 'lead-1', name: 'Lead A', company: 'Comp A' }]) },
      task: { findMany: vi.fn().mockResolvedValue([{ id: 'task-1', title: 'Task A', status: 'PENDING' }]) },
      user: { findMany: vi.fn() },
      mailMessage: { findMany: vi.fn() },
      chatMessage: { findMany: vi.fn() },
      invoice: { findMany: vi.fn() },
    };
    vi.mocked(withTenant).mockReturnValue(mockPrisma as any);

    const results = await globalSearch(mockTenantId, 'query', mockUserId);

    // 2. Verify only authorized routes are exposed
    expect(results.length).toBe(2);
    expect(results.some(r => r.type === 'LEAD')).toBe(true);
    expect(results.some(r => r.type === 'TASK')).toBe(true);
    expect(results.some(r => r.type === 'CUSTOMER')).toBe(false); // IDOR / RBAC protection intact
  });
});
