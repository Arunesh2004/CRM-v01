'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle, LayoutDashboard, Search, FileText } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function AssistantPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; tools?: any[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const sendMessage = async (presetInput?: string) => {
    const textToSend = presetInput || input;
    if (!textToSend.trim()) return;
    
    const userMessage = { role: 'user' as const, text: textToSend };
    setMessages(prev => [...prev, userMessage]);
    if (!presetInput) setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationId
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to chat');

      if (data.conversationId) {
        setConversationId(data.conversationId);
      }

      setMessages(prev => [
        ...prev, 
        { role: 'assistant', text: data.text, tools: data.toolResponses }
      ]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `I encountered an error processing that request. Please try again later.` }]);
    } finally {
      setLoading(false);
    }
  };

  const renderToolResult = (tool: any, idx: number) => {
    if (tool.error) {
      return (
        <div key={idx} className="flex items-center gap-2 text-sm text-red-500 bg-red-500/10 p-2 rounded mt-2 border border-red-500/20">
          <AlertCircle className="w-4 h-4" />
          <span>Failed to execute {tool.name}</span>
        </div>
      );
    }
    
    let summary = 'Tool executed successfully';
    if (tool.name === 'search_crm') summary = `Found ${tool.result?.length || 0} CRM records`;
    if (tool.name === 'get_customer') summary = `Checked details for ${tool.result?.name || 'Customer'}`;
    if (tool.name === 'update_lead') summary = `Updated lead status successfully`;

    return (
      <div key={idx} className="flex items-center gap-2 text-xs text-blue-400 bg-blue-900/20 p-2 rounded mt-2 border border-blue-500/20 font-medium">
        <Sparkles className="w-3 h-3" />
        <span>{summary}</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-5xl mx-auto p-4 md:p-6 lg:p-8 space-y-4">
      <div className="flex items-center gap-3 pb-2 border-b border-white/10">
        <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
          <Bot className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Copilot</h1>
          <p className="text-sm text-gray-400">Your secure CRM enterprise assistant</p>
        </div>
      </div>
      
      <Card className="flex-1 overflow-hidden border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl flex flex-col relative">
        {/* Chat History Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="p-4 bg-white/5 rounded-full ring-1 ring-white/10 shadow-2xl">
                <Sparkles className="w-12 h-12 text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-medium text-white">How can I help you today?</h2>
                <p className="text-gray-400 max-w-md mx-auto">
                  I can search your CRM, analyze customer details, or update lead statuses securely based on your permissions.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-3xl mt-8">
                <button 
                  onClick={() => sendMessage("Find customers related to Acme")}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <Search className="w-5 h-5 text-blue-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-white">Search Customers</div>
                  <div className="text-xs text-gray-400 mt-1">"Find customers related to Acme"</div>
                </button>
                <button 
                  onClick={() => sendMessage("Show me my active leads")}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <LayoutDashboard className="w-5 h-5 text-purple-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-white">Pipeline Review</div>
                  <div className="text-xs text-gray-400 mt-1">"Show me my active leads"</div>
                </button>
                <button 
                  onClick={() => sendMessage("Draft a follow up email")}
                  className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-left group"
                >
                  <FileText className="w-5 h-5 text-green-400 mb-2 group-hover:scale-110 transition-transform" />
                  <div className="text-sm font-medium text-white">Draft Email</div>
                  <div className="text-xs text-gray-400 mt-1">"Draft a follow up email"</div>
                </button>
              </div>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mt-1">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-sm' 
                  : 'bg-white/5 border border-white/10 text-gray-100 rounded-tl-sm'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed text-sm md:text-base">
                  {msg.text}
                </div>
                {msg.tools && msg.tools.length > 0 && (
                  <div className="mt-3 flex flex-col gap-1">
                    {msg.tools.map((t: any, idx: number) => renderToolResult(t, idx))}
                  </div>
                )}
              </div>
              
              {msg.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center mt-1">
                  <User className="w-4 h-4 text-gray-300" />
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-4 justify-start animate-in fade-in">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg mt-1">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm p-4 shadow-sm flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                <span className="text-sm text-gray-400 font-medium">Processing your request...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-black/40 border-t border-white/10">
          <div className="relative max-w-4xl mx-auto flex items-end gap-2">
            <textarea 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask Copilot to search customers, summarize deals, or update leads..."
              className="flex-1 max-h-32 min-h-[56px] resize-none rounded-xl border border-white/20 bg-white/5 p-4 pr-12 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all backdrop-blur-md"
              disabled={loading}
              rows={1}
            />
            <button 
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="absolute right-2 bottom-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center mt-2 text-xs text-gray-500">
            AI Copilot respects your tenant permissions. It cannot bypass security policies.
          </div>
        </div>
      </Card>
    </div>
  );
}
