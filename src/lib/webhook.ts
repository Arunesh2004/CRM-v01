import crypto from 'crypto';

export class WebhookSecurity {
  /**
   * Verifies the signature of an incoming webhook payload using a symmetric secret (e.g. Twilio, Stripe, Resend).
   * @param payload Stringified raw body payload
   * @param signature The signature from the headers (e.g. X-Twilio-Signature)
   * @param secret The webhook signing secret configured for this provider
   * @param algorithm The hashing algorithm to use (default: sha256)
   */
  static verifySignature(payload: string, signature: string, secret: string, algorithm: string = 'sha256'): boolean {
    if (!signature || !secret) {
      return false;
    }

    try {
      const hmac = crypto.createHmac(algorithm, secret);
      const digest = hmac.update(payload).digest('hex');
      
      // Some providers use base64 (like Twilio). Handle comparison accordingly.
      const digestBase64 = crypto.createHmac(algorithm, secret).update(payload).digest('base64');
      
      // Use timingSafeEqual to prevent timing attacks
      return (
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest)) ||
        crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digestBase64))
      );
    } catch (e) {
      console.error('Webhook signature verification failed:', e);
      return false;
    }
  }
}
