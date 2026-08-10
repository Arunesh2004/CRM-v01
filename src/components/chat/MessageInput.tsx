'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Send, Paperclip } from 'lucide-react';
import { sendMessageAction } from '@/modules/chat/actions/chat.actions';
import { useRealtimeChat } from '@/hooks/useRealtimeChat';

export function MessageInput({ conversationId }: { conversationId: string }) {
  const [content, setContent] = useState('');
  const [isPending, setIsPending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addOptimisticMessage, updateMessage } = useRealtimeChat(conversationId, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!content.trim() || isPending) return;

    const messageText = content.trim();
    const optimisticId = `temp-${Date.now()}`;
    
    // Optimistic UI
    addOptimisticMessage({
      optimisticId,
      content: messageText,
      senderId: 'ME', // Handled properly on the server, just for UI sorting/rendering
      createdAt: new Date().toISOString(),
      status: 'QUEUED'
    });

    setContent('');
    setIsPending(true);

    try {
      const res = await sendMessageAction(conversationId, messageText);
      if (res.success && res.data) {
        updateMessage(optimisticId, { status: 'SENT', id: res.data.id });
      } else {
        console.error('Failed to send:', res.error);
        updateMessage(optimisticId, { status: 'FAILED' });
      }
    } catch (err) {
      updateMessage(optimisticId, { status: 'FAILED' });
    } finally {
      setIsPending(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  return (
    <form onSubmit={handleSend} className="p-3 md:p-4 bg-card border-t flex items-end gap-2">
      <Button type="button" variant="ghost" size="icon" className="shrink-0 mb-1" disabled={isPending}>
        <Paperclip className="h-5 w-5 text-muted-foreground" />
      </Button>
      <div className="flex-1 relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Type a message..."
          className="w-full min-h-[44px] max-h-[120px] resize-none rounded-2xl bg-muted p-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 shadow-sm transition-shadow scrollbar-thin overflow-y-auto"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={isPending}
        />
      </div>
      <Button 
        type="submit" 
        size="icon" 
        className="shrink-0 mb-1 rounded-full h-11 w-11 shadow-sm transition-transform active:scale-95"
        disabled={!content.trim() || isPending}
      >
        <Send className="h-5 w-5" />
      </Button>
    </form>
  );
}
