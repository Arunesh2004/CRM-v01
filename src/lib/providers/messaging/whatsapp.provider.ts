import { MessagingProvider, SendWhatsAppPayload, MessagingProviderResponse } from './messaging.interface';
import { Logger } from '../../logger/logger';

export class WhatsAppProvider implements MessagingProvider {
  private token: string;
  private phoneNumberId: string;
  private baseUrl: string;

  constructor() {
    this.token = process.env.WHATSAPP_TOKEN || 'test_token';
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || 'test_phone_id';
    this.baseUrl = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;
  }

  async sendMessage(tenantId: string, payload: SendWhatsAppPayload): Promise<MessagingProviderResponse> {
    try {
      const body: any = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: payload.to,
        type: payload.type
      };

      if (payload.type === 'text') {
        body.text = { body: payload.text };
      } else if (payload.type === 'image' || payload.type === 'document') {
        body[payload.type] = {};
        if (payload.mediaId) body[payload.type].id = payload.mediaId;
        else if (payload.mediaUrl) body[payload.type].link = payload.mediaUrl;
      } else if (payload.type === 'template') {
        body.template = {
          name: payload.templateName,
          language: { code: payload.templateLanguage || 'en_US' },
          components: payload.templateComponents || []
        };
      }

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        Logger.error('WhatsApp API sending failed', new Error(data.error?.message || 'Unknown API Error'), { tenantId, to: payload.to });
        return { success: false, error: data.error?.message || 'Unknown API Error' };
      }

      const messageId = data.messages?.[0]?.id;
      Logger.info('WhatsApp message sent successfully', { tenantId, messageId });
      return { success: true, messageId };
    } catch (err: any) {
      Logger.error('WhatsApp Provider execution failed', err, { tenantId });
      return { success: false, error: err.message };
    }
  }

  async receiveWebhook(payload: any): Promise<any> { return payload; }
  async verifyWebhook(signature: string, payload: any): Promise<boolean> {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) return false;
    
    // In WhatsApp, signature is sha256=...
    // But for this generic demo we just do a HMAC check:
    const crypto = require('crypto');
    const expected = crypto.createHmac('sha256', appSecret).update(JSON.stringify(payload)).digest('hex');
    return signature === `sha256=${expected}`;
  }
}

export class MockMessagingProvider implements MessagingProvider {
  async sendMessage(tenantId: string, payload: SendWhatsAppPayload): Promise<MessagingProviderResponse> {
    if (payload.to === 'fail') {
      return { success: false, error: 'Mock provider simulated failure' };
    }
    Logger.info(`[MOCK WHATSAPP] Sending ${payload.type} to ${payload.to}`, { tenantId });
    return { success: true, messageId: `mock_wa_${Date.now()}` };
  }
  async receiveWebhook(payload: any): Promise<any> { return payload; }
  async verifyWebhook(signature: string, payload: any): Promise<boolean> { 
    return signature === 'valid_mock_signature';
  }
}

export class MessagingProviderFactory {
  static getProvider(): MessagingProvider {
    if (process.env.NODE_ENV === 'production' && process.env.WHATSAPP_TOKEN) {
      return new WhatsAppProvider();
    }
    return new MockMessagingProvider();
  }
}
