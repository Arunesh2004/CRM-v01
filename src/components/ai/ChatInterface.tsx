'use client';
import { useState } from 'react';
import { askAssistantAction } from '@/modules/ai/actions/assistant.actions';

export function ChatInterface() {
  const [history, setHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async (q: string) => {
    if (!q.trim()) return;
    
    const newHistory = [...history, { role: 'user' as const, content: q }];
    setHistory(newHistory);
    setPrompt('');
    setLoading(true);

    const res = await askAssistantAction(q);
    
    if (res.success) {
      setHistory([...newHistory, { role: 'assistant', content: res.data || 'Empty response' }]);
    } else {
      setHistory([...newHistory, { role: 'assistant', content: 'Error: ' + res.error }]);
    }
    
    setLoading(false);
  };

  const suggestions = [
    "Show critical incidents",
    "How many customers do we have?",
    "What subscription are we using?",
    "Show communication statistics",
    "Camera status"
  ];

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-lg shadow border">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center text-gray-500 mt-10">
            <h2 className="text-xl font-bold mb-2">Welcome to your AI Copilot</h2>
            <p>Ask me anything about your CRM, Security, or Billing data.</p>
          </div>
        )}
        
        {history.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[70%] p-3 rounded-lg ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-100 text-gray-800 rounded-bl-none'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[70%] p-3 rounded-lg bg-gray-100 text-gray-800 rounded-bl-none animate-pulse">
              Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-gray-50">
        <div className="flex flex-wrap gap-2 mb-3">
          {suggestions.map((s, i) => (
            <button 
              key={i} 
              onClick={() => handleSend(s)}
              disabled={loading}
              className="text-xs bg-white border border-gray-300 hover:bg-gray-100 px-2 py-1 rounded-full text-gray-600"
            >
              {s}
            </button>
          ))}
        </div>
        
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSend(prompt); }} 
          className="flex space-x-2"
        >
          <input 
            type="text" 
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="Ask about your business metrics..."
            className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button 
            type="submit" 
            disabled={loading || !prompt.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
