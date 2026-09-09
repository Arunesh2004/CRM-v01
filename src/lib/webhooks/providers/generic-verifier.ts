import { WebhookVerifier } from './webhook-verifier.interface';
import crypto from 'crypto';

export class GenericWebhookVerifier implements WebhookVerifier {
  verify(payload: string, headers: Record<string, string>, secret: string): boolean {
    try {
      // Assuming a standard HMAC SHA256 signature in a common header 'x-signature'
      const signature = headers['x-signature'];
      if (!signature) return false;
      
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
        
      // Use timingSafeEqual to prevent timing attacks
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      );
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
    } catch (err) {
      return false;
    }
  }
}
