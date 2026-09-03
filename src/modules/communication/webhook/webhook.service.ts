import { withTenant, withTenantTransaction } from '@db/utils/prisma-tenant';
import prisma from '../../../../database/utils/prisma';
import { ProviderFactory } from '../../../lib/providers/provider.factory';
import crypto from 'crypto';


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
  static async processWebhook(tenantId: string, providerName: string, eventId: string, eventType: string, payload: any, signature: string) {
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
      webhookEvent = await withTenant(tenantId).webhookEvent.create({
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
      await this.handleEvent(tenantId, providerName, eventType, payload);
      
      await withTenant(tenantId).webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'PROCESSED', processedAt: new Date() }
      });
    } catch (e: any) {
      await withTenant(tenantId).webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'FAILED' }
      });
      throw e;
    }
  }

  private static async handleEvent(tenantId: string, providerName: string, eventType: string, payload: any) {
    if (providerName === 'whatsapp' || providerName === 'twilio') {
      const providerMessageId = payload.messageId; // Mock mapping
      const newStatus = eventType === 'delivered' ? 'DELIVERED' : (eventType === 'failed' ? 'FAILED' : 'SENT');
      
      if (!providerMessageId) return;

      // Find message by a provider message ID (mocked lookup or actual if stored in future)
      const msg = await withTenant(tenantId).chatMessage.findFirst({ 
        where: { 
          metadata: { path: ['idempotencyKey'], equals: providerMessageId } 
        } 
      });
      
      if (msg) {
        const metadata = (msg.metadata as any) || {};
        const currentStatus = metadata.status;

        // Out of order transition check:
        if (currentStatus === 'DELIVERED' && newStatus !== 'DELIVERED') {
          throw new Error('Invalid state transition: Already delivered');
        }
        if (currentStatus === 'FAILED') {
           throw new Error('Invalid state transition: Already failed');
        }

        await withTenant(tenantId).chatMessage.update({
          where: { id: msg.id },
          data: { metadata: { ...metadata, status: newStatus } }
        });
      }
    }
  }
}
