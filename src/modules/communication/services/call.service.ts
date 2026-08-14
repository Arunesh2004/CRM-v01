import { requireTenant } from '@/lib/auth';
import prisma from '@/../database/utils/prisma';
import { ProviderFactory } from '@/infrastructure/provider.factory';
import { CallProvider } from '@/infrastructure/calling/call.interface';
import { getCurrentUser } from '@/lib/auth';
import { Logger } from '@/lib/observability/logger';

const logger = new Logger();

export class CallService {
  static async initiateCustomerCall(toPhoneNumber: string, customerId?: string) {
    const tenantId = await requireTenant();
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");

    const provider = (await ProviderFactory.getForTenant('TELEPHONY')) as CallProvider;
    
    // Create initial Call record
    const callRecord = await prisma.call.create({
      data: {
        tenantId,
        providerId: 'PENDING',
        direction: 'OUTBOUND',
        status: 'QUEUED',
        startedAt: new Date(),
        participants: {
          create: {
            tenantId,
            userId: user.id,
            phoneNumber: toPhoneNumber
          }
        }
      }
    });

    try {
      const providerCallId = await provider.startCall(
        '+15550000000', // Mock from number
        toPhoneNumber,
        { customerId, userId: user.id }
      );

      // Update Call record with provider info
      await prisma.call.update({
        where: { id: callRecord.id },
        data: { 
          status: 'COMPLETED', // mock successful completion
          providerId: providerCallId 
        }
      });

      // Audit Log
      // Audit Log
      await prisma.auditLog.create({
        data: {
          tenantId,
          actorId: user.id,
          actorType: 'USER',
          action: 'CALL_INITIATED',
          resource: 'COMMUNICATION',
          resourceId: callRecord.id,
          metadata: { to: toPhoneNumber }
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
            type: 'CALL',
            content: `Outbound call to ${toPhoneNumber}`
          }
        });
      }

      return { id: providerCallId, status: 'COMPLETED' };
    } catch (error: any) {
      logger.error('Failed to initiate call', undefined, { tenantId, providerErrorName: error?.name });
      await prisma.call.update({
        where: { id: callRecord.id },
        data: { status: 'FAILED' }
      });
      throw error;
    }
  }
}
