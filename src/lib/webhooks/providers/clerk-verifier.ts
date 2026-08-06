import { WebhookVerifier } from './webhook-verifier.interface';
import { Webhook } from 'svix';

export class ClerkWebhookVerifier implements WebhookVerifier {
  verify(payload: string, headers: Record<string, string>, secret: string): boolean {
    try {
      const wh = new Webhook(secret);
      wh.verify(payload, headers);
      return true;
    } catch (err) {
      return false;
    }
  }
}
