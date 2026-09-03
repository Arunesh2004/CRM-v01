import crypto from 'crypto';
import { RealtimeProvider } from './interfaces';
import { Logger } from '@/lib/observability/logger';

const logger = new Logger();

export class PusherProvider implements RealtimeProvider {
  private appId = process.env.PUSHER_APP_ID || '';
  private key = process.env.PUSHER_KEY || '';
  private secret = process.env.PUSHER_SECRET || '';
  private cluster = process.env.PUSHER_CLUSTER || 'us2';

  async sendToUser(userId: string, event: string, payload: any): Promise<void> {
    await this.broadcast(`private-user-${userId}`, event, payload);
  }

  async sendToConversation(conversationId: string, event: string, payload: any): Promise<void> {
    await this.broadcast(`private-conversation-${conversationId}`, event, payload);
  }
  
  async sendToTenant(tenantId: string, event: string, payload: any): Promise<void> {
    await this.broadcast(`private-tenant-${tenantId}`, event, payload);
  }

  async broadcast(channel: string, event: string, payload: any): Promise<void> {
    if (!this.appId || !this.key || !this.secret) {
      logger.warn('Pusher credentials missing. Cannot broadcast.', { channel, event });
      return;
    }

    const body = JSON.stringify({ name: event, channels: [channel], data: JSON.stringify(payload) });
    const timestamp = Math.floor(Date.now() / 1000);
    const method = 'POST';
    const path = `/apps/${this.appId}/events`;
    
    const md5Body = crypto.createHash('md5').update(body).digest('hex');
    const authVersion = '1.0';
    const queryString = `auth_key=${this.key}&auth_timestamp=${timestamp}&auth_version=${authVersion}&body_md5=${md5Body}`;
    
    const stringToSign = `${method}\n${path}\n${queryString}`;
    const authSignature = crypto.createHmac('sha256', this.secret).update(stringToSign).digest('hex');

    const url = `https://api-${this.cluster}.pusher.com${path}?${queryString}&auth_signature=${authSignature}`;

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body
      });
      if (!response.ok) {
        const text = await response.text();
        logger.error('Pusher broadcast failed', undefined, new Error(`Status: ${response.status}, Body: ${text}`));
      }
    } catch (err: any) {
      logger.error('Pusher network error', undefined, err);
    }
  }
}
