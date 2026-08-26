import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import prisma from '../../../database/utils/prisma';
import { sendEmail } from '@/modules/communication/email/email.service';
import { createCall } from '@/modules/communication/telephony/telephony.service';
import { sendMessage } from '@/modules/communication/messaging/messaging.service';
import { executeAsSystem, SystemOperation } from '../../../database/utils/prisma-system';

// Mock auth module
let mockUserId = '';
let mockTenantId = '';
let mockHasPermission = true;

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(async () => {}),
  requireTenant: vi.fn(async () => mockTenantId),
  requirePermission: vi.fn(async (resource, action) => {
    if (!mockHasPermission) throw new Error('Forbidden');
  })
}));

vi.mock('@/lib/tenant-context', () => ({
  getCurrentUserContext: vi.fn(async () => ({ id: mockUserId, tenantId: mockTenantId }))
}));

describe('Communication Services', () => {
  let testConversationId = '';

  beforeAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      const tenant = await tx.tenant.create({ data: { name: 'Comm Test Tenant' } });
      const user = await tx.user.create({
        data: { clerkId: 'comm_test_' + Date.now(), email: `comm_${Date.now()}@test.com`, tenantId: tenant.id, status: 'ACTIVE' }
      });
      mockUserId = user.id;
      mockTenantId = tenant.id;

      // Create a real conversation for the happy-path sendMessage test
      const conv = await tx.chatConversation.create({
        data: {
          tenantId: tenant.id,
          type: 'DIRECT',
          participants: { create: [{ tenantId: tenant.id, userId: user.id, role: 'ADMIN' }] }
        }
      });
      testConversationId = conv.id;
    });
  });

  afterAll(async () => {
    await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
      // AuditLog is append-only, and prevents Tenant/User deletion
      // We will leave the mock tenant and user in the test database
      await tx.callLog.deleteMany({ where: { tenantId: mockTenantId } });
      await tx.mailMessage.deleteMany({ where: { tenantId: mockTenantId } });
      await tx.mailThread.deleteMany({ where: { tenantId: mockTenantId } });
      await tx.chatMessage.deleteMany({ where: { tenantId: mockTenantId } });
      await tx.chatConversation.deleteMany({ where: { tenantId: mockTenantId } });
    });
  });

  it('should successfully send an email', async () => {
    mockHasPermission = true;
    const email = await sendEmail({ to: 'test@target.com', subject: 'Integration Test', bodyHtml: '<p>Test</p>' });
    expect(email).toBeDefined();
    expect((email.metadata as any).to).toBe('test@target.com');
    expect(email.tenantId).toBe(mockTenantId);
  });

  it('should successfully create a call log', async () => {
    mockHasPermission = true;
    const call = await createCall({ to: '+1234567890', from: '+0987654321' });
    expect(call).toBeDefined();
    expect(call.status).toBe('COMPLETED');
    expect(call.tenantId).toBe(mockTenantId);
  });

  it('should successfully send a message', async () => {
    mockHasPermission = true;
    // Uses the real testConversationId created in beforeAll (not a fake-id)
    const msg = await sendMessage({ conversationId: testConversationId, content: 'Test message', senderId: mockUserId });
    expect(msg).toBeDefined();
    expect(msg.content).toBe('Test message');
    expect(msg.tenantId).toBe(mockTenantId);
  });

  it('should reject communication when permission is denied', async () => {
    mockHasPermission = false;
    await expect(
      sendEmail({ to: 'test@target.com', subject: 'Fail Test', bodyHtml: '<p>Test</p>' })
    ).rejects.toThrow('Forbidden');
  });

  describe('Adversarial IDOR & Cross-Tenant Security', () => {
    let victimTenantId = '';
    let victimConversationId = '';
    
    beforeAll(async () => {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        const vTenant = await tx.tenant.create({ data: { name: 'Victim Tenant' } });
        victimTenantId = vTenant.id;
        const vUser = await tx.user.create({
          data: { clerkId: 'victim_' + Date.now(), email: `victim_${Date.now()}@test.com`, tenantId: vTenant.id, status: 'ACTIVE' }
        });
        const conv = await tx.chatConversation.create({
          data: {
            tenantId: vTenant.id,
            type: 'DIRECT',
            participants: {
              create: [{ tenantId: vTenant.id, userId: vUser.id, role: 'ADMIN' }]
            }
          }
        });
        victimConversationId = conv.id;
      });
    });
    
    afterAll(async () => {
      await executeAsSystem(SystemOperation.SECURITY_AUDIT, async (tx) => {
        await tx.chatParticipant.deleteMany({ where: { tenantId: victimTenantId } });
        await tx.chatConversation.deleteMany({ where: { tenantId: victimTenantId } });
      });
    });

    it('should reject when attacker attempts to send message to victim conversation (IDOR)', async () => {
      mockHasPermission = true;
      mockTenantId = 'attacker-tenant-123'; // Attacker tenant context
      mockUserId = 'attacker-user-123';
      
      await expect(
        sendMessage({ conversationId: victimConversationId, content: 'Malicious payload', senderId: mockUserId })
      ).rejects.toThrow(); // Either 'Conversation not found' or 'Not authorized'
    });
  });
});
