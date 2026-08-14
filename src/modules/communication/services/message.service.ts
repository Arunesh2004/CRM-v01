import { requireTenant } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { ProviderFactory } from '@/infrastructure/provider.factory';
import { ChatProvider } from '@/infrastructure/chat/chat.interface';
import { getCurrentUser } from '@/lib/auth';
import { Logger } from '@/lib/observability/logger';

const logger = new Logger();

export class MessageService {
  static async sendCustomerSMS(toPhoneNumber: string, body: string) {
    const tenantId = await requireTenant();
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const provider = (await ProviderFactory.getForTenant('INTERNAL_CHAT')) as ChatProvider;
    
    // We would create a Conversation/Message record here.
    // Simplifying for this scope:
    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        type: 'WHATSAPP'
      }
    });

    const messageRecord = await prisma.message.create({
      data: {
        tenantId,
        content: body,
        senderId: user.id,
        conversationId: conversation.id
      }
    });

    try {
      await provider.sendMessage({
        conversationId: conversation.id,
        senderId: user.id,
        content: body,
        metadata: { messageId: messageRecord.id }
      });

      // Audit Log
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          actorType: 'USER',
          action: 'SMS_SENT',
          resource: 'COMMUNICATION',
          resourceId: messageRecord.id,
          metadata: { to: toPhoneNumber }
        }
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to send SMS', undefined, { tenantId, providerErrorName: error?.name });
      throw error;
    }
  }
}
