'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { format, isSameDay } from 'date-fns';
import { User2 } from 'lucide-react';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';

export function MessageList({
  initialMessages,
  currentUserId,
  conversationId
}: {
  initialMessages: any[];
  currentUserId: string;
  conversationId: string;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { messages } = useRealtimeChat(conversationId, initialMessages);

  useEffect(() => {
    // Scroll to bottom on new messages
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Group messages for date separators
  const grouped = messages.reduce((acc: any[], msg: any, i: number, arr: any[]) => {
    acc.push(msg);
    const nextMsg = arr[i + 1];
    if (nextMsg && !isSameDay(new Date(msg.createdAt), new Date(nextMsg.createdAt))) {
      acc.push({ type: 'DATE_SEPARATOR', date: msg.createdAt, id: `sep-${msg.id}` });
    }
    return acc;
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-6">
      <div className="flex flex-col-reverse space-y-6 space-y-reverse">
        {grouped.map((msg, idx) => {
          if (msg.type === 'DATE_SEPARATOR') {
            return (
              <div key={msg.id} className="flex justify-center my-4 relative">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground bg-background px-3 py-1 rounded-full border shadow-sm z-10">
                  {format(new Date(msg.date), 'MMMM d, yyyy')}
                </span>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-border/50 -translate-y-1/2 z-0" />
              </div>
            );
          }

          const isMe = msg.senderId === currentUserId;
          const showAvatar = idx === 0 || grouped[idx - 1]?.senderId !== msg.senderId || grouped[idx - 1]?.type === 'DATE_SEPARATOR';

          return (
            <div key={msg.id || msg.optimisticId} className={cn("flex gap-3", isMe && "flex-row-reverse group")}>
              {!isMe && (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shrink-0">
                  {showAvatar ? (
                    <span className="text-[10px] font-bold">
                      {msg.sender?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  ) : (
                    <User2 className="w-4 h-4 opacity-0" /> 
                  )}
                </div>
              )}
              
              <div className={cn("flex flex-col max-w-[75%]", isMe && "items-end")}>
                {!isMe && showAvatar && (
                  <span className="text-xs text-muted-foreground ml-1 mb-1 font-medium">
                    {msg.sender?.email?.split('@')[0]}
                  </span>
                )}
                
                <div className={cn(
                  "px-4 py-2 text-sm whitespace-pre-wrap break-words relative",
                  isMe ? "bg-primary text-primary-foreground rounded-2xl rounded-tr-sm" : "bg-muted text-foreground rounded-2xl rounded-tl-sm",
                  msg.status === 'FAILED' && "bg-destructive text-destructive-foreground opacity-80"
                )}>
                  {msg.deletedAt ? (
                    <span className="italic opacity-60">This message was deleted.</span>
                  ) : (
                    <>
                      {msg.content}
                      {msg.editedAt && (
                        <span className="text-[10px] opacity-60 ml-2">(edited)</span>
                      )}
                    </>
                  )}
                </div>
                
                <div className={cn("flex items-center gap-2 mt-1 mx-1", isMe ? "flex-row-reverse" : "flex-row")}>
                  <span className="text-[10px] text-muted-foreground opacity-70">
                    {format(new Date(msg.createdAt), 'h:mm a')}
                  </span>
                  {msg.status === 'QUEUED' && (
                    <span className="text-[10px] text-muted-foreground italic">Sending...</span>
                  )}
                  {msg.status === 'FAILED' && (
                    <span className="text-[10px] text-destructive font-medium cursor-pointer hover:underline">Retry</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div ref={bottomRef} />
    </div>
  );
}
