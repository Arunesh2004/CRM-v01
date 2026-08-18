'use client';

import { useState } from 'react';

export default function AssistantPage() {
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; tools?: any[] }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const userMessage = { role: 'user' as const, text: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: messages
        })
      });

      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Failed to chat');

      setMessages(prev => [
        ...prev, 
        { role: 'assistant', text: data.text, tools: data.toolResponses }
      ]);
    } catch (error: any) {
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${error.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] p-6">
      <h1 className="text-2xl font-bold mb-4">AI Copilot Assistant</h1>
      
      <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow p-4 mb-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-gray-500 text-center mt-10">How can I help you with your CRM today?</div>
        )}
        
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[75%] rounded-lg p-3 ${
              msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-900'
            }`}>
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.tools && msg.tools.length > 0 && (
                <div className="mt-2 text-xs border-t border-gray-300 pt-2 space-y-1">
                  {msg.tools.map((t: any, idx: number) => (
                    <div key={idx} className="bg-gray-200 p-1 rounded font-mono">
                      Tool [{t.name}]: {t.result ? 'Success' : 'Failed'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 rounded-lg p-3">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask a question..."
          className="flex-1 border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={loading}
        />
        <button 
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}

