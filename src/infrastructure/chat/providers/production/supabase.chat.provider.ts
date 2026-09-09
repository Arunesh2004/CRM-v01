import { ChatProvider, ChatMessagePayload } from '../../chat.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class SupabaseChatProvider implements ChatProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  constructor(private credentials: any) {}
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async sendMessage(payload: ChatMessagePayload): Promise<boolean> {
    throw new ProviderNotImplementedError('Supabase Chat', 'sendMessage');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: External provider boundary lacks strict types
  subscribeToConversation(conversationId: string, callback: (event: any) => void): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Unused local variable — safe removal requires verifying no side-effect; deferred to S3
    throw new ProviderNotImplementedError('Supabase Chat', 'subscribeToConversation');
  }
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  unsubscribe(conversationId: string): void {
    throw new ProviderNotImplementedError('Supabase Chat', 'unsubscribe');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async broadcastTyping(conversationId: string, userId: string, isTyping: boolean): Promise<boolean> {
    throw new ProviderNotImplementedError('Supabase Chat', 'broadcastTyping');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- S2 Residual Debt: Legacy unused local
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Intentional callback/interface parameter
  async updatePresence(userId: string, status: 'ONLINE' | 'OFFLINE' | 'AWAY'): Promise<boolean> {
    throw new ProviderNotImplementedError('Supabase Chat', 'updatePresence');
  }
}
