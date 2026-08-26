import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { ChatService } from '../chat.service';

interface SendMessageInput {
  conversationId: string;
  content: string;
  senderId: string;
}

export async function sendMessage(input: SendMessageInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'CREATE');
  
  // Verify conversation belongs to tenant (enforced by withTenant RLS context)
  const prisma = withTenant(tenantId);
  const conversation = await prisma.chatConversation.findUnique({
    where: { id: input.conversationId }
  });

  if (!conversation) {
    // Conversation either does not exist or belongs to a different tenant.
    // Return consistent error to prevent enumeration of cross-tenant conversation IDs.
    throw new Error('Conversation not found or access denied');
  }
  
  return await ChatService.sendMessage(tenantId, input.conversationId, input.senderId, input.content);
}
