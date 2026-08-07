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

export async function completeCall(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  return await prisma.call.updateMany({
    where: { id: callId, tenantId },
    data: { status: 'COMPLETED', endedAt: new Date() }
  });
}

export async function processCallRecording(callId: string, storageUrl: string, duration: number) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  const user = await getCurrentUserContext();

  const call = await prisma.call.findFirst({ where: { id: callId, tenantId } });
  if (!call) throw new Error("Related entity does not belong to this tenant: Call");

  return await prisma.$transaction(async (tx: any) => {
    const recording = await tx.callRecording.create({
      data: { tenantId, callId, storageUrl, duration, storageKey: storageUrl }
    });
    await tx.auditLog.create({
      data: { tenantId, actorId: user.id, actorType: 'USER', action: 'RECORDING_CREATED', resource: 'COMMUNICATION', resourceId: recording.id }
    });
    return recording;
  });
}

export async function requestAITranscript(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  
  const call = await prisma.call.findFirst({ where: { id: callId, tenantId } });
  if (!call) throw new Error("Related entity does not belong to this tenant: Call");

  return await prisma.callTranscript.create({
    data: { tenantId, callId, status: 'PROCESSING' }
  });
}

export async function completeAITranscript(transcriptId: string, content: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  return await prisma.callTranscript.updateMany({
    where: { id: transcriptId, tenantId },
    data: { status: 'COMPLETED', content }
  });
}

export async function requestAISummary(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  
  const call = await prisma.call.findFirst({ where: { id: callId, tenantId } });
  if (!call) throw new Error("Related entity does not belong to this tenant: Call");

  return await prisma.aISummary.create({
    data: { tenantId, callId, status: 'PROCESSING' }
  });
}

export async function completeAISummary(summaryId: string, summary: string, sentiment: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  return await prisma.aISummary.updateMany({
    where: { id: summaryId, tenantId },
    data: { status: 'COMPLETED', summary, sentiment }
  });
}

export async function getCalls() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  return await prisma.call.findMany({ where: { tenantId }, orderBy: { startedAt: 'desc' } });
}

export async function getRecordings(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  return await prisma.callRecording.findMany({ where: { tenantId, callId }, orderBy: { createdAt: 'desc' } });
}

export async function getTranscripts(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  return await prisma.callTranscript.findMany({ where: { tenantId, callId }, orderBy: { createdAt: 'desc' } });
}

export async function getAISummaries(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  return await prisma.aISummary.findMany({ where: { tenantId, callId }, orderBy: { createdAt: 'desc' } });
}
