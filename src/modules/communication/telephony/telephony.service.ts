import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import { withTenant } from '../../../../database/utils/prisma-tenant';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import { CreateCallInput } from '../communication.types';
import { getCurrentUserContext } from '@/lib/tenant-context';

export async function createCall(input: CreateCallInput) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'CREATE');
  const user = await getCurrentUserContext();
  
  const prisma = withTenant(tenantId);
  const provider = ProviderFactory.getTelephonyProvider();
  
  const response = await provider.makeCall(input.to, input.from);
  if (!response.success) {
    throw new Error('Telephony provider failed');
  }
  
  return await prisma.$transaction(async (tx: any) => {
    const call = await tx.call.create({
      data: {
        tenantId,
        providerId: response.callId,
        direction: 'OUTBOUND',
        status: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });
    
    await tx.callParticipant.create({
      data: {
        tenantId,
        callId: call.id,
        userId: user.id,
        contactId: input.contactId,
        phoneNumber: input.to
      }
    });

    if (input.contactId) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'CALL',
          content: `Initiated outbound call to ${input.to}`,
          actorId: user.id,
          entityType: 'CONTACT',
          entityId: input.contactId,
        }
      });
    }

    await tx.auditLog.create({
      data: {
        tenantId,
        actorId: user.id,
        actorType: 'USER',
        action: 'CALL_INITIATED',
        resource: 'COMMUNICATION',
        resourceId: call.id
      }
    });

    return call;
  });
}
