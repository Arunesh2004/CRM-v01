import { ChatProvider, ChatMessagePayload } from '../../chat.interface';
import { ProviderNotImplementedError } from '../../../errors';

export class SupabaseChatProvider implements ChatProvider {
  constructor(private credentials: any) {}

  async sendMessage(payload: ChatMessagePayload): Promise<boolean> {
    throw new ProviderNotImplementedError('Supabase Chat', 'sendMessage');
  }

  subscribeToConversation(conversationId: string, callback: (event: any) => void): void {
    throw new ProviderNotImplementedError('Supabase Chat', 'subscribeToConversation');
  }

  unsubscribe(conversationId: string): void {
    throw new ProviderNotImplementedError('Supabase Chat', 'unsubscribe');
  }

  async broadcastTyping(conversationId: string, userId: string, isTyping: boolean): Promise<boolean> {
    throw new ProviderNotImplementedError('Supabase Chat', 'broadcastTyping');
  }

  async updatePresence(userId: string, status: 'ONLINE' | 'OFFLINE' | 'AWAY'): Promise<boolean> {
    throw new ProviderNotImplementedError('Supabase Chat', 'updatePresence');
  }
}
