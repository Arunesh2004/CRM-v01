import { requireAuth } from '@/lib/auth';
import { getMessagesAction, getUserConversationsAction } from '@/modules/chat/actions/chat.actions';
import { MessageList } from '@/components/chat/MessageList';
import { MessageInput } from '@/components/chat/MessageInput';
import { Hash, User2, Users, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function ChatConversationPage({ params }: { params: { conversationId: string } }) {
  const user = await requireAuth();
  
  // Verify access implicitly through getMessagesAction (which calls verifyConversationAccess)
  const msgRes = await getMessagesAction(params.conversationId);
  if (!msgRes.success) {
    notFound();
  }
  const initialMessages = msgRes.data?.data || [];
  
  // We need basic conversation details (name/type). We could fetch it specifically, but for now we'll get from user convos or a dedicated fetch.
  // A dedicated fetch is better, but since it's cached we can reuse getUserConversationsAction or create a new action.
  const convsRes = await getUserConversationsAction();
  const activeConversation = convsRes.success ? convsRes.data?.conversations?.find((c: any) => c.id === params.conversationId) : null;
  
  if (!activeConversation) {
    notFound();
  }

  let title = activeConversation.name || 'Chat';
  let Icon = Hash;
  if (activeConversation.type === 'INTERNAL_DIRECT') {
    title = activeConversation.members.find((m: any) => m.userId !== user.id)?.user?.email || 'Unknown User';
    Icon = User2;
  } else if (activeConversation.type === 'INTERNAL_GROUP') {
    Icon = Users;
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b flex items-center px-2 md:px-4 bg-card shrink-0 gap-3 z-10 shadow-sm">
        {/* Mobile back button */}
        <Link href="/chat" className="md:hidden p-2 rounded-md hover:bg-accent flex items-center justify-center shrink-0 text-muted-foreground">
          <ChevronLeft className="w-5 h-5" />
        </Link>
        
        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{title}</h3>
          {/* We could add online status here later */}
        </div>
      </div>

      {/* Messages */}
      <MessageList 
        initialMessages={initialMessages} 
        currentUserId={user.id} 
        conversationId={params.conversationId}
      />
      
      {/* Input */}
      <MessageInput conversationId={params.conversationId} />
    </div>
  );
}
