import prisma from '../../../database/utils/prisma';
import { WebhookVerifier } from './providers/webhook-verifier.interface';

export async function checkDuplicateEvent(eventId: string, provider: string): Promise<boolean> {
  const existing = await prisma.webhookEvent.findUnique({
    where: { eventId }
  });
  return !!existing;
}

export async function receiveWebhook(input: {
  provider: string;
  eventId: string;
  eventType: string;
  payload: any;
  signatureVerified: boolean;
}) {
  const isDuplicate = await checkDuplicateEvent(input.eventId, input.provider);
  if (isDuplicate) {
    throw new Error(`Duplicate webhook event: ${input.eventId}`);
  }

  return await prisma.webhookEvent.create({
    data: {
      provider: input.provider,
      eventId: input.eventId,
      eventType: input.eventType,
      payload: input.payload,
      signatureVerified: input.signatureVerified,
      status: 'PENDING'
    }
  });
}

export function verifyWebhook(
  verifier: WebhookVerifier,
  payload: string,
  headers: Record<string, string>,
  secret: string
): boolean {
  // Check replay timestamp if provided
  const timestamp = headers['svix-timestamp'] || headers['x-timestamp'];
  if (timestamp) {
    const timeMs = parseInt(timestamp, 10) * (timestamp.length === 10 ? 1000 : 1);
    const age = Date.now() - timeMs;
    // Reject if older than 5 minutes
    if (age > 5 * 60 * 1000) {
      return false;
    }
  }

  return verifier.verify(payload, headers, secret);
}

export async function markProcessed(eventId: string) {
  return await prisma.webhookEvent.update({
    where: { eventId },
    data: {
      status: 'PROCESSED',
      processedAt: new Date()
    }
  });
}

export async function markFailed(eventId: string) {
  return await prisma.webhookEvent.update({
    where: { eventId },
    data: {
      status: 'FAILED'
    }
  });
}
