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
      <div className="hidden md:flex flex-1 flex-col items-center justify-center text-[#8891B0] bg-[#06080F]/30 backdrop-blur-sm h-full border-l border-white/[.04]">
        <div className="w-20 h-20 rounded-full bg-white/5 border border-white/[.08] flex items-center justify-center mb-6 shadow-2xl">
          <MessageSquare className="w-8 h-8 text-violet-400 opacity-80" />
        </div>
        <h3 className="font-display font-bold text-2xl text-white mb-2">Secure Comms</h3>
        <p className="text-sm">Select a conversation from the sidebar to establish a secure link.</p>
      </div>
    </>
  );
}
