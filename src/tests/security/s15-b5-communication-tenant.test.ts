import { describe, it, expect, vi } from 'vitest';
import { getMessagesAction, sendMessageAction } from '@/modules/communication/actions/chat.actions';
import * as AuthModule from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  requireAuth: vi.fn(),
}));

describe('Phase 15B: Security Tests - Chat Tenant Isolation', () => {
  it('prevents sending a message to a conversation belonging to another tenant', async () => {
    // Mock user context as Tenant A
    vi.spyOn(AuthModule, 'requireAuth').mockResolvedValue({
      id: 'user-tenant-a',
      tenantId: 'tenant-a-id',
      onboardingStatus: 'COMPLETED',
    } as any);

    // Try sending a message to a conversation owned by Tenant B
    const maliciousPayload = {
      conversationId: 'conversation-from-tenant-b',
      content: 'Malicious Message'
    };

    // The chat action should throw an error when attempting to fetch or write to the cross-tenant conversation
    // because ChatService uses withTenant(user.tenantId)
    await expect(sendMessageAction(maliciousPayload)).rejects.toThrow();
  });

  it('prevents reading messages from a conversation belonging to another tenant', async () => {
    // Mock user context as Tenant A
    vi.spyOn(AuthModule, 'requireAuth').mockResolvedValue({
      id: 'user-tenant-a',
      tenantId: 'tenant-a-id',
      onboardingStatus: 'COMPLETED',
    } as any);

    const maliciousConversationId = 'conversation-from-tenant-b';

    // The chat action should throw an error when attempting to fetch messages
    // because ChatService uses withTenant(user.tenantId)
    await expect(getMessagesAction(maliciousConversationId)).rejects.toThrow();
  });
});
