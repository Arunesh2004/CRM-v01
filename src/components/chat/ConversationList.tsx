'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { User2, Hash, Users, Plus, Search } from 'lucide-react';
import { Button } from '../ui/button';
import { formatDistanceToNow } from 'date-fns';

export function ConversationList({ 
  conversations, 
  currentUserId,
  activeId,
  onSelect
}: { 
  conversations: any[]; 
  currentUserId: string;
  activeId?: string;
  onSelect: (id: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    let name = conv.name || '';
    if (conv.type === 'INTERNAL_DIRECT') {
      const other = conv.members.find((m: any) => m.userId !== currentUserId);
      name = other?.user?.email || 'Unknown User';
    }
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="w-full h-full flex flex-col bg-muted/10 border-r">
      <div className="p-4 border-b flex flex-col gap-3 bg-card shrink-0 shadow-sm z-10">
        <div className="flex justify-between items-center">
          <h2 className="font-semibold tracking-tight text-lg">Chats</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-muted/50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
          />
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
        {filteredConversations.map(conv => {
          let name = conv.name;
          let Icon = Hash;
          if (conv.type === 'INTERNAL_DIRECT') {
            const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
            name = otherMember?.user?.email?.split('@')[0] || 'Unknown User';
            Icon = User2;
          } else if (conv.type === 'INTERNAL_GROUP') {
            Icon = Users;
          }

          const isActive = activeId === conv.id;
          const unreadCount = conv.unreadCount || 0;
          const lastMessage = conv.messages?.[0];

          return (
            <button
              key={conv.id}
              onClick={() => onSelect(conv.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 text-left rounded-lg transition-all border border-transparent",
                isActive ? "bg-primary/5 border-primary/20 shadow-sm" : "hover:bg-accent hover:border-border/50"
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors",
                isActive ? "bg-primary text-primary-foreground shadow-sm" : "bg-primary/10 text-primary"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <p className="text-sm font-semibold truncate text-foreground/90">{name}</p>
                  {lastMessage && (
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap ml-2 font-medium">
                      {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false }).replace('about', '').replace('minutes', 'm').replace('hours', 'h').replace('days', 'd')}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className={cn(
                    "text-xs truncate",
                    unreadCount > 0 ? "text-foreground font-medium" : "text-muted-foreground"
                  )}>
                    {lastMessage ? (
                      lastMessage.senderId === currentUserId ? `You: ${lastMessage.content}` : lastMessage.content
                    ) : (
                      <span className="italic opacity-60">No messages yet</span>
                    )}
                  </p>
                  {unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0 shadow-sm">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {filteredConversations.length === 0 && (
          <div className="text-center p-6 text-sm text-muted-foreground">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 opacity-50" />
            </div>
            {searchQuery ? "No conversations found" : "No conversations yet. Start one!"}
          </div>
        )}
      </div>
    </div>
  );
}
