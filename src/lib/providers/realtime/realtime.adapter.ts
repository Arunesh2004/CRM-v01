/**
 * RealtimeAdapter — abstract base class for all realtime providers.
 * Extracted into its own module to break the circular dependency between:
 *   adapter.ts → ProviderFactory → pusher.provider.ts → adapter.ts
 */
export abstract class RealtimeAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract publishToUser(tenantId: string, userId: string, event: string, payload: any): Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract publishToChannel(tenantId: string, channelId: string, event: string, payload: any): Promise<void>;
}
