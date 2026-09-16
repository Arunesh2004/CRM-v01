'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, User as UserIcon, Phone } from 'lucide-react';
import Pusher from 'pusher-js';
import { getConversationsAction, getMessagesAction, sendMessageAction } from '@/modules/communication/actions/chat.actions';

export default function ChatInterface({ userId, tenantId }: { userId: string; tenantId: string }) {
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load conversations
    getConversationsAction().then(res => {
      if (res.success) {
        setConversations(res.data);
      }
      setLoading(false);
    }).catch(err => {
      console.error('Failed to load conversations:', err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!activeConvId) return;

    // Load messages
    getMessagesAction(activeConvId).then(res => {
      if (res.success) setMessages(res.data);
    });

    // Setup Pusher
    const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
    if (!pusherKey) {
      console.warn('NEXT_PUBLIC_PUSHER_KEY missing; realtime chat disabled.');
      return;
    }

    const pusher = new Pusher(pusherKey, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'mt1',
      authEndpoint: '/api/realtime/auth',
    });

    const channelName = `private-chat-tenant_${tenantId}_conv_${activeConvId}`;
    const channel = pusher.subscribe(channelName);

    channel.bind('new_message', (data: any) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(channelName);
      pusher.disconnect();
    };
  }, [activeConvId, tenantId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConvId) return;
    const content = input;
    setInput('');
    try {
      const res = await sendMessageAction({ conversationId: activeConvId, content });
      if (res && res.success && res.data) {
        setMessages(prev => {
          if (prev.find(m => m.id === res.data.id)) return prev;
          return [...prev, res.data];
        });
      }
    } catch (e) {
      console.error(e);
      // rollback or show error
    }
  };

  if (loading) return <div className="p-6 text-center text-gray-500">Loading...</div>;

  return (
    <div className="flex h-[700px] bg-white border rounded-lg shadow-sm overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 border-r flex flex-col">
        <div className="p-4 border-b font-semibold bg-gray-50 text-gray-800">
          Conversations
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500 text-sm">No conversations found.</div>
          ) : (
            conversations.map(c => (
              <div 
                key={c.id} 
                onClick={() => setActiveConvId(c.id)}
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors ${activeConvId === c.id ? 'bg-indigo-50 border-l-4 border-l-indigo-500' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <UserIcon className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{c.name || 'Chat'}</p>
                    <p className="text-sm text-gray-500 truncate">Tap to view</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConvId ? (
          <>
            <div className="p-4 border-b font-semibold bg-gray-50 text-gray-800 flex items-center justify-between">
              <span>Active Conversation</span>
              {conversations.find(c => c.id === activeConvId)?.targetUserId && (
                <button
                  onClick={() => {
                    const targetUserId = conversations.find(c => c.id === activeConvId)?.targetUserId;
                    if (targetUserId) {
                      window.dispatchEvent(new CustomEvent('webrtc-initiate-call', { detail: { targetUserId } }));
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors font-medium"
                >
                  <Phone className="w-4 h-4" />
                  Call
                </button>
              )}
            </div>
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50/50">
              {messages.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500">
                  No messages yet. Say hello!
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(m => {
                    const isMine = m.senderId === userId;
                    return (
                      <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${isMine ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border text-gray-900 rounded-bl-none shadow-sm'}`}>
                          <p>{m.content}</p>
                          {m.referenceType && m.referenceId && (
                            <div className="mt-2 text-xs bg-black/10 p-2 rounded">
                              Referenced {m.referenceType}: {m.referenceId}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-white">
              <form 
                className="flex items-center gap-2"
                onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              >
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..." 
                  className="flex-1 bg-gray-100 border-transparent rounded-full px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                />
                <button 
                  type="submit" 
                  disabled={!input.trim()}
                  className="p-2 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50/50">
            <p className="text-gray-500">Select a conversation to start messaging.</p>
          </div>
        )}
      </div>
    </div>
  );
}
