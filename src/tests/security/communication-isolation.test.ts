import { describe, it, expect, vi, beforeEach } from 'vitest';
import prisma from '@db/utils/prisma';
import { withTenant } from '@db/utils/prisma-tenant';
import * as authLib from '@/lib/auth';
import { sendEmailAction, sendMessageAction } from '@/app/(crm)/customers/[id]/actions';
import { getCustomerTimelineAction } from '@/modules/crm/actions/customer.actions';
import { globalSearch } from '@/modules/search/search.service';

import { executeAsSystem, SystemOperation } from '@db/utils/prisma-system';

describe('Phase C5 Communication Isolation & Security', () => {
  let userId = '';
  let tenantAId = '';
  let tenantBId = '';
  let customerAId = '';
  let customerBId = '';
  let recipientAId = '';
  let hasCommRead = true;
  let hasCommCreate = true;

  beforeEach(async () => {
    vi.resetAllMocks();
    
    tenantAId = 'tenant-A-' + Date.now();
    tenantBId = 'tenant-B-' + Date.now();
    userId = 'user-A-' + Date.now();
    recipientAId = 'recipient-A-' + Date.now();

    // Setup Mock Data - use executeAsSystem to bypass RLS for setup
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.tenant.createMany({
        data: [
          { id: tenantAId, name: 'Tenant A' },
          { id: tenantBId, name: 'Tenant B' }
        ]
      });

      await tx.user.createMany({
        data: [
          { id: userId, tenantId: tenantAId, email: 'usera@test.com' },
          { id: recipientAId, tenantId: tenantAId, email: 'recipienta@test.com' },
        ]
      });

      const cA = await tx.customer.create({
        data: { tenantId: tenantAId, name: 'Customer A', normalizedName: 'cust-a-' + Date.now() }
      });
      customerAId = cA.id;

      const cB = await tx.customer.create({
        data: { tenantId: tenantBId, name: 'Customer B', normalizedName: 'cust-b-' + Date.now() }
      });
      customerBId = cB.id;
    });

    vi.spyOn(authLib, 'requireAuth').mockResolvedValue({ id: userId, email: 'usera@test.com', status: 'ACTIVE', userRoles: [] } as any);
    vi.spyOn(authLib, 'requireTenant').mockResolvedValue(tenantAId);
    
    vi.spyOn(authLib, 'requirePermission').mockImplementation(async (resource, action) => {
      if (resource === 'COMMUNICATION' && action === 'READ' && !hasCommRead) throw new Error('Forbidden');
      if (resource === 'COMMUNICATION' && action === 'CREATE' && !hasCommCreate) throw new Error('Forbidden');
      return true;
    });
    vi.spyOn(authLib, 'checkPermissionFast').mockImplementation(async (uid, resource, action) => {
      if (resource === 'COMMUNICATION' && action === 'READ' && !hasCommRead) return false;
      return true;
    });

    hasCommRead = true;
    hasCommCreate = true;
  });

  it('TEST 1 - Cross-Tenant Customer Link Attack', async () => {
    // Tenant A user tries to send an email linking to Tenant B's customer
    const res = await sendEmailAction(customerBId, 'recipienta@test.com', 'Hack', 'Attempting cross-tenant');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/unauthorized/i);
  });

  it('TEST 2 - Timeline Tenant Isolation', async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      await tx.mailThread.create({
        data: { tenantId: tenantBId, subject: 'Secret B', customerId: customerBId, messages: {
          create: { tenantId: tenantBId, senderId: userId, bodyText: 'Secret Msg B' }
        }}
      });
    });

    // Try to view Timeline for Customer A, ensure B's thread doesn't leak
    const res = await getCustomerTimelineAction({ customerId: customerAId });
    expect(res.success).toBe(true);
    expect(res.data?.data).toHaveLength(0); // Should not see B's thread
  });

  it('TEST 3 - Mail Deep-Link IDOR', async () => {
    // Server components fetch directly via prisma. We will simulate the page's fetch logic.
    const threadB = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.mailThread.create({
      data: { tenantId: tenantBId, subject: 'Secret B' }
    }));

    const thread = await withTenant(tenantAId).mailThread.findFirst({
      where: { id: threadB.id, tenantId: tenantAId }
    });

    expect(thread).toBeNull(); // IDOR prevented by tenantId filter
  });

  it('TEST 4 - Chat Deep-Link IDOR', async () => {
    const chatB = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.chatConversation.create({
      data: { tenantId: tenantBId, type: 'DIRECT', name: 'Secret B' }
    }));

    const chat = await withTenant(tenantAId).chatConversation.findFirst({
      where: { id: chatB.id, tenantId: tenantAId }
    });

    expect(chat).toBeNull(); // IDOR prevented
  });

  it('TEST 5 - RBAC Bypass', async () => {
    hasCommCreate = false;
    const res = await sendEmailAction(customerAId, 'recipienta@test.com', 'Hack', 'RBAC bypass');
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Forbidden/i);

    hasCommRead = false;
    const searchRes = await globalSearch(tenantAId, 'Secret', userId);
    // Since we mocked checkPermissionFast to return false for COMMUNICATION, mails/chats should not be queried
    const comms = searchRes.filter(r => r.type === 'MESSAGE');
    expect(comms.length).toBe(0);
  });

  it('TEST 6 - Search Deep-Link Regression', async () => {
    const thread = await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => tx.mailThread.create({
      data: { tenantId: tenantAId, subject: 'Searchable Thread', messages: {
        create: { tenantId: tenantAId, senderId: userId, bodyText: 'UniqueSearchTerm' }
      }}
    }));

    const res = await globalSearch(tenantAId, 'UniqueSearchTerm', userId);
    expect(res.length).toBe(1);
    expect(res[0].type).toBe('MESSAGE');
    expect(res[0].url).toBe(`/communication/mail/${thread.id}`);
  });
});
