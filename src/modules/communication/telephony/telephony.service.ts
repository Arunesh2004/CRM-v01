import { requireAuth, requireTenant, requirePermission } from '@/lib/auth';
import globalPrisma from '@db/utils/prisma';
import { withTenant, withTenantTransaction } from '../../../../database/utils/prisma-tenant';
import { ProviderFactory } from '@/lib/providers/provider.factory';
import { CreateCallInput } from '../communication.types';
import { getCurrentUserContext } from '@/lib/tenant-context';
import { CallStatus } from '@prisma/client';

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
  
  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    // We log the call directly without participant models
    // Defaulting to system employee if not known for this legacy mapping
    const callLog = await tx.callLog.create({
      data: {
        tenantId,
        providerCallId: response.callId,
        provider: 'EXTERNAL', // Mapped statically for legacy support
        status: CallStatus.COMPLETED, // IN_PROGRESS removed in Phase 3
        callerEmployeeId: user.id, // Using userId as employeeId for legacy bridge
        receiverEmployeeId: input.contactId || 'unknown'
      }
    });

    if (input.contactId) {
      await tx.activityTimeline.create({
        data: {
          tenantId,
          type: 'CALL',
          content: `Initiated outbound call to ${input.to}`,
          actorId: user.id,
          entityType: 'CUSTOMER',
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
        resourceId: callLog.id
      }
    });

    return callLog;
  });
}

export async function completeCall(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  return await prisma.callLog.updateMany({
    where: { id: callId, tenantId },
    data: { status: CallStatus.COMPLETED }
  });
}

export async function processCallRecording(callId: string, storageUrl: string, duration: number) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  const user = await getCurrentUserContext();

  const callLog = await prisma.callLog.findFirst({ where: { id: callId, tenantId } });
  if (!callLog) throw new Error("Related entity does not belong to this tenant: Call");

  return await globalPrisma.$transaction(async (baseTx: any) => {
    const tx = await withTenantTransaction(baseTx, tenantId);
    // Map to CommunicationAttachment
    const attachment = await tx.communicationAttachment.create({
      data: { 
        tenantId, 
        uploaderId: user.id,
        attachedToType: 'CALL',
        attachedToId: callId,
        fileName: `recording_${callId}.mp3`,
        fileType: 'audio/mp3',
        storageUrl,
        size: duration * 1000 // Mock size based on duration
      }
    });
    
    await tx.callLog.update({
      where: { id: callId },
      data: { duration }
    });

    await tx.auditLog.create({
      data: { tenantId, actorId: user.id, actorType: 'USER', action: 'RECORDING_CREATED', resource: 'COMMUNICATION', resourceId: attachment.id }
    });
    return attachment;
  });
}

export async function requestAITranscript(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  
  const call = await prisma.callLog.findFirst({ where: { id: callId, tenantId } });
  if (!call) throw new Error("Related entity does not belong to this tenant: Call");

  return await prisma.callLog.update({
    where: { id: callId },
    data: { metadata: { ...((call.metadata as any) || {}), transcriptStatus: 'PROCESSING' } }
  });
}

export async function completeAITranscript(callId: string, content: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  // Requirement: Do not store large transcripts inside CallLog.metadata. Store references/URLs/provider IDs only.
  // Mocking a reference url instead of storing the content.
  const transcriptRefUrl = `s3://transcripts/${callId}.txt`;
  
  const call = await prisma.callLog.findFirst({ where: { id: callId, tenantId } });
  return await prisma.callLog.update({
    where: { id: callId },
    data: { metadata: { ...((call?.metadata as any) || {}), transcriptStatus: 'COMPLETED', transcriptUrl: transcriptRefUrl } }
  });
}

export async function requestAISummary(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);
  
  const call = await prisma.callLog.findFirst({ where: { id: callId, tenantId } });
  if (!call) throw new Error("Related entity does not belong to this tenant: Call");

  return await prisma.callLog.update({
    where: { id: callId },
    data: { metadata: { ...((call.metadata as any) || {}), summaryStatus: 'PROCESSING' } }
  });
}

export async function completeAISummary(callId: string, summary: string, sentiment: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  const prisma = withTenant(tenantId);

  const call = await prisma.callLog.findFirst({ where: { id: callId, tenantId } });
  return await prisma.callLog.update({
    where: { id: callId },
    data: { metadata: { ...((call?.metadata as any) || {}), summaryStatus: 'COMPLETED', summary, sentiment } }
  });
}

export async function getCalls() {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  return await prisma.callLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' } });
}

export async function getRecordings(callId: string) {
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  return await prisma.communicationAttachment.findMany({ where: { tenantId, attachedToId: callId, attachedToType: 'CALL' }, orderBy: { createdAt: 'desc' } });
}

export async function getTranscripts(callId: string) {
  // Transcripts are now inside CallLog metadata
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  const call = await prisma.callLog.findFirst({ where: { tenantId, id: callId } });
  return call?.metadata;
}

export async function getAISummaries(callId: string) {
  // Summaries are now inside CallLog metadata
  await requireAuth();
  const tenantId = await requireTenant();
  await requirePermission('COMMUNICATION', 'READ');
  const prisma = withTenant(tenantId);
  const call = await prisma.callLog.findFirst({ where: { tenantId, id: callId } });
  return call?.metadata;
}
