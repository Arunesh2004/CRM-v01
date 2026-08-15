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
    <div className="w-full h-full flex flex-col bg-[#06080F]/50 border-r border-white/[.04]">
      <div className="p-4 border-b border-white/[.04] flex flex-col gap-3 bg-white/[.02] shrink-0 z-10">
        <div className="flex justify-between items-center">
          <h2 className="font-display font-bold text-lg text-white">Secure Comms</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-violet-500/20 text-white hover:text-violet-400">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-[#8891B0]" />
          <input
            type="text"
            placeholder="Search comms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#0D1326]/40 border border-white/[.08] rounded-lg text-white text-sm focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/50 transition-all placeholder:text-white/20"
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
                "w-full flex items-center gap-3 p-3 text-left rounded-lg transition-all border",
                isActive ? "bg-violet-500/10 border-violet-500/30 shadow-[0_0_15px_rgba(124,92,252,0.1)]" : "border-transparent hover:bg-white/[.02] hover:border-white/[.04]"
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-colors border",
                isActive ? "bg-violet-500/20 text-violet-400 border-violet-500/30" : "bg-white/5 text-[#8891B0] border-white/[.08]"
              )}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                  <p className={cn("text-sm font-semibold truncate transition-colors", isActive ? "text-violet-400" : "text-white/90")}>{name}</p>
                  {lastMessage && (
                    <span className="text-[10px] uppercase tracking-wider text-[#8891B0] whitespace-nowrap ml-2 font-medium">
                      {formatDistanceToNow(new Date(lastMessage.createdAt), { addSuffix: false }).replace('about', '').replace('minutes', 'm').replace('hours', 'h').replace('days', 'd')}
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-2">
                  <p className={cn(
                    "text-xs truncate",
                    unreadCount > 0 ? "text-white font-medium" : "text-[#8891B0]"
                  )}>
                    {lastMessage ? (
                      lastMessage.senderId === currentUserId ? `You: ${lastMessage.content}` : lastMessage.content
                    ) : (
                      <span className="italic opacity-60">No messages yet</span>
                    )}
                  </p>
                  {unreadCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(244,63,94,0.5)]">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
        {filteredConversations.length === 0 && (
          <div className="text-center p-6 text-sm text-[#8891B0]">
            <div className="w-12 h-12 rounded-full bg-white/5 border border-white/[.08] flex items-center justify-center mx-auto mb-3">
              <Search className="w-5 h-5 opacity-50" />
            </div>
            {searchQuery ? "No conversations found" : "No conversations yet. Start one!"}
          </div>
        )}
      </div>
    </div>
  );
}
