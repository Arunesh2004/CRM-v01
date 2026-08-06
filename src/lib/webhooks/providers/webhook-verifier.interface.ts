export interface WebhookVerifier {
  verify(payload: string, headers: Record<string, string>, secret: string): boolean;
}
