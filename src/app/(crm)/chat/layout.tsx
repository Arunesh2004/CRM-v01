import { ReactNode } from 'react';
import { requireAuth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getUserConversationsAction } from '@/modules/chat/actions/chat.actions';
import { ChatSidebarClient } from './ChatSidebarClient';

export default async function ChatLayout({ children }: { children: ReactNode }) {
  const user = await requireAuth();
  if (!user) redirect('/sign-in');

  const res = await getUserConversationsAction(undefined, 50);
  const conversations = res.success ? (res.data?.conversations || []) : [];

  return (
    <div className="h-[calc(100vh-6rem)] w-full flex bg-background overflow-hidden border rounded-xl shadow-sm relative">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:w-80 shrink-0 border-r h-full flex-col">
        <ChatSidebarClient 
          conversations={conversations} 
          currentUserId={user.id} 
        />
      </div>

      {/* Main Content Area (either mobile list, desktop placeholder, or chat window) */}
      <div className="flex-1 flex flex-col h-full bg-background relative overflow-hidden">
        {children}
      </div>
    </div>
  );
}
