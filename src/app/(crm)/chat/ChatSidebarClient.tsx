'use client';

import { useRouter } from 'next/navigation';
import { ConversationList } from '@/components/chat/ConversationList';

export function ChatSidebarClient({
  conversations,
  currentUserId,
  activeId
}: {
  conversations: any[];
  currentUserId: string;
  activeId?: string;
}) {
  const router = useRouter();

  return (
    <ConversationList
      conversations={conversations}
      currentUserId={currentUserId}
      activeId={activeId}
      onSelect={(id) => {
        router.push(`/chat?conversationId=${id}`);
      }}
    />
  );
}
