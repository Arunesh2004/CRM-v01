import prisma from '../../../../database/utils/prisma';
import { ProviderFactory } from '../../../lib/providers/provider.factory';
import crypto from 'crypto';
import { MessageStatus } from '@prisma/client';

export class WebhookSignatureService {
  /**
   * Validate webhook signature using the ProviderFactory.
   */
  static async validateSignature(providerName: string, signature: string, payload: any): Promise<boolean> {
    if (!signature) return false;
    
    let provider;
    try {
      if (providerName.toLowerCase() === 'whatsapp' || providerName.toLowerCase() === 'twilio' || providerName.toLowerCase() === 'resend') {
        provider = ProviderFactory.getMessagingProvider();
      }
    } catch (e) {
      return false;
    }

    if (!provider || typeof provider.verifyWebhook !== 'function') return false;
    return provider.verifyWebhook(signature, payload);
  }

  /**
   * Process a webhook event safely (handles deduplication and out-of-order execution).
   */
  static async processWebhook(tenantId: string | null, providerName: string, eventId: string, eventType: string, payload: any, signature: string) {
    // 1. Signature Verification
    const isValid = await this.validateSignature(providerName, signature, payload);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

    // 2. Replay Protection & Logging
    // Use transaction/upsert to ensure uniqueness
    let webhookEvent;
    try {
      webhookEvent = await prisma.webhookEvent.create({
        data: {
          tenantId,
          provider: providerName,
          eventId,
          eventType,
          payloadHash,
          signatureVerified: true,
          status: 'PENDING',
        }
      });
    } catch (e: any) {
      if (e.code === 'P2002') {
        throw new Error('Webhook replay attack detected: Event already processed');
      }
      throw e;
    }

    // 3. Process the Event
    try {
      await this.handleEvent(providerName, eventType, payload);
      
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'PROCESSED', processedAt: new Date() }
      });
    } catch (e: any) {
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'FAILED' }
      });
      throw e;
    }
  }

  private static async handleEvent(providerName: string, eventType: string, payload: any) {
    if (providerName === 'whatsapp' || providerName === 'twilio') {
      const providerMessageId = payload.messageId; // Mock mapping
      const newStatus = eventType === 'delivered' ? MessageStatus.DELIVERED : (eventType === 'failed' ? MessageStatus.FAILED : MessageStatus.SENT);
      
      if (!providerMessageId) return;

      // Find message by a provider message ID (mocked lookup or actual if stored in future)
      // Since our Message model doesn't store providerMessageId directly on Message, we match via idempotency or fallback
      // For the simulation script we might not need this exact mapping, but we must protect state transitions.
      const msg = await prisma.message.findFirst({ where: { idempotencyKey: providerMessageId } });
      
      if (msg) {
        // Out of order transition check:
        if (msg.status === MessageStatus.DELIVERED && newStatus !== MessageStatus.DELIVERED) {
          throw new Error('Invalid state transition: Already delivered');
        }
        if (msg.status === MessageStatus.FAILED) {
           throw new Error('Invalid state transition: Already failed');
        }

        await prisma.message.update({
          where: { id: msg.id },
          data: { status: newStatus }
        });
      }
    }
  }
}
