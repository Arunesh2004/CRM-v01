import { requireAuth } from '@/lib/auth';
import { getUserConversationsAction } from '@/modules/chat/actions/chat.actions';
import { ChatSidebarClient } from './ChatSidebarClient';
import { MessageSquare } from 'lucide-react';

export default async function ChatPage() {
  const user = await requireAuth();
  const res = await getUserConversationsAction(undefined, 50);
  const conversations = res.success ? (res.data?.conversations || []) : [];

  return (
    <>
      {/* Mobile view: Show conversation list */}
      <div className="md:hidden flex-1 flex flex-col h-full w-full">
        <ChatSidebarClient 
          conversations={conversations} 
          currentUserId={user.id} 
        />
      </div>

      {/* Desktop view: Empty state placeholder */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center text-muted-foreground bg-muted/20 h-full">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <MessageSquare className="w-8 h-8 text-primary/60" />
        </div>
        <h3 className="font-semibold text-lg text-foreground">Your Messages</h3>
        <p className="text-sm">Select a conversation from the sidebar to start chatting.</p>
      </div>
    </>
  );
}
