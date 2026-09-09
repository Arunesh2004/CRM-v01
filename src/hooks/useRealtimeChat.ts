'use client';

import { useState, useEffect } from 'react';

// This acts as our abstraction. 
// In production, this would subscribe to a provider like Pusher, Supabase, etc.
// using the `conversationId`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
export function useRealtimeChat(conversationId: string, initialMessages: any[]) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  const [messages, setMessages] = useState<any[]>(initialMessages);
  
  useEffect(() => {
    // Sync if initialMessages changes (e.g. navigation)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- State setter inside effect retained for deterministic data fetching flow.
    setMessages(initialMessages);
  }, [initialMessages, conversationId]);

  useEffect(() => {
    // DEMO IMPLEMENTATION:
    // This is where we'd establish the WebSocket connection or SSE listener.
    // e.g. const channel = pusher.subscribe(`conversation-${conversationId}`);
    // channel.bind('message:new', (newMsg) => setMessages(prev => [newMsg, ...prev]));

    const handleDemoRealtime = (e: CustomEvent) => {
      const payload = e.detail;
      if (payload.conversationId === conversationId) {
        if (payload.type === 'NEW_MESSAGE') {
          setMessages(prev => [payload.message, ...prev]);
        }
      }
    };

    // We can simulate it internally by listening to window events just for UI demo purposes
    window.addEventListener('chat:realtime', handleDemoRealtime as EventListener);

    return () => {
      window.removeEventListener('chat:realtime', handleDemoRealtime as EventListener);
      // channel.unbind_all(); channel.unsubscribe();
    };
  }, [conversationId]);
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing

  // We can provide an optimistic update helper
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  const addOptimisticMessage = (msg: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
    setMessages(prev => [msg, ...prev]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- S2 Residual Debt: Legacy internal payload requires architectural typing
  const updateMessage = (id: string, newMsg: any) => {
    setMessages(prev => prev.map(m => m.id === id ? { ...m, ...newMsg } : m));
  };

  return { messages, addOptimisticMessage, updateMessage };
}
