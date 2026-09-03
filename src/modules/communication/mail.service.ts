import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../database/utils/prisma';

export class MailService {
  /**
   * Send an internal mail
   */
  static async sendMail(tenantId: string, senderId: string, subject: string, bodyHtml: string, toIds: string[], ccIds: string[] = [], bccIds: string[] = []) {
    // Basic verification
    if (!toIds.length) throw new Error('Mail must have at least one recipient');

    // Create thread and message
    const thread = await withTenant(tenantId).mailThread.create({
      data: {
        tenantId,
        subject,
        messages: {
          create: {
            tenantId,
            senderId,
            bodyHtml,
            recipients: {
              create: [
                ...toIds.map(id => ({ tenantId, userId: id, type: 'TO' })),
                ...ccIds.map(id => ({ tenantId, userId: id, type: 'CC' })),
                ...bccIds.map(id => ({ tenantId, userId: id, type: 'BCC' }))
              ]
            }
          }
        }
      },
      include: {
        messages: {
          include: { recipients: true }
        }
      }
    });

    const message = thread.messages[0];

    await withTenant(tenantId).auditLog.create({
      data: {
        tenantId,
        actorId: senderId, actorType: 'USER',
        action: 'MAIL_SENT',
        resource: 'COMMUNICATION',
        resourceId: message.id,
        metadata: { threadId: thread.id, subject }
      }
    });

    return message;
  }

  /**
   * Get inbox for a user
   */
  static async getInbox(tenantId: string, userId: string, cursor?: string, take: number = 50) {
    return await withTenant(tenantId).mailRecipient.findMany({
      where: {
        tenantId,
        userId,
        archivedAt: null
      },
      take,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        message: {
          include: {
            thread: { select: { subject: true } },
            sender: { select: { firstName: true, lastName: true, profilePhotoUrl: true } }
          }
        }
      }
    });
  }

  /**
   * Archive a mail thread for a specific user
   */
  static async archiveMail(tenantId: string, messageId: string, userId: string) {
    const recipient = await withTenant(tenantId).mailRecipient.findFirst({
      where: { tenantId, messageId, userId }
    });

    if (!recipient) throw new Error('Mail not found in your inbox.');

    const archived = await withTenant(tenantId).mailRecipient.update({
      where: { id: recipient.id },
      data: { archivedAt: new Date() }
    });

    await withTenant(tenantId).auditLog.create({
      data: {
        tenantId,
        actorId: userId, actorType: 'USER',
        action: 'MAIL_ARCHIVED',
        resource: 'COMMUNICATION',
        resourceId: messageId
      }
    });

    return archived;
  }
}
