import { requireTenant } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { ProviderFactory } from '@/infrastructure/provider.factory';
import { EmailProvider } from '@/infrastructure/email/email.interface';
import { getCurrentUser } from '@/lib/auth';

export class EmailService {
  static async sendCustomerEmail(to: string, subject: string, bodyHtml: string, bodyText?: string, customerId?: string) {
    const tenantId = await requireTenant();
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const provider = (await ProviderFactory.getForTenant('EMAIL')) as EmailProvider;
    
    // Save to DB before sending
    const thread = await prisma.emailThread.create({
      data: {
        tenantId,
        subject,
        messages: {
          create: {
            tenantId,
            direction: 'OUTBOUND',
            from: user.email, // Or a configured generic email
            to,
            bodyHtml,
            bodyText: bodyText || '',
            status: 'QUEUED'
          }
        }
      }
    });

    try {
      const providerMessageId = await provider.sendEmail({ 
        from: user.email || 'system@internal.app',
        to: [to], 
        subject, 
        html: bodyHtml, 
        text: bodyText 
      });

      // Update message status
      const message = await prisma.emailMessage.findFirst({
        where: { threadId: thread.id },
        orderBy: { createdAt: 'desc' }
      });
      
      if (message) {
        await prisma.emailMessage.update({
          where: { id: message.id },
          data: { 
            status: 'SENT',
            providerMessageId: providerMessageId 
          }
        });
      }

      // Audit Log
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          actorType: 'USER',
          action: 'EMAIL_SENT',
          resource: 'COMMUNICATION',
          resourceId: thread.id,
          metadata: { to, subject }
        }
      });

      // Activity Timeline
      if (customerId) {
        await prisma.activityTimeline.create({
          data: {
            tenantId,
            actorId: user.id,
            entityType: 'CUSTOMER',
            entityId: customerId,
            type: 'EMAIL',
            content: `Email Sent: Subject: ${subject}`
          }
        });
      }

      return { messageId: providerMessageId, status: 'SENT' };
    } catch (error) {
      console.error("[EmailService] Failed to send email", error);
      throw error;
    }
  }
}
