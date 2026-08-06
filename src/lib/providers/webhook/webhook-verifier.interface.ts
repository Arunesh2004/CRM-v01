export interface WebhookVerifier {
  verifySignature(signature: string, payload: string, secret: string): boolean;
  verifyTimestamp(timestamp: string, maxAgeSeconds: number): boolean;
}
