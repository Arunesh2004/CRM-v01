'use client';
import { useState, useRef, useEffect } from 'react';
import { askAssistantAction } from '@/modules/ai/actions/assistant.actions';
import { Bot, X, Maximize2, Minimize2, MessageSquare, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AssistantPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [history, isOpen, loading]);

  // Handle escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = async (q: string) => {
    if (!q.trim()) return;

    const newHistory = [...history, { role: 'user' as const, content: q }];
    setHistory(newHistory);
    setPrompt('');
    setLoading(true);

    const res = await askAssistantAction(q, conversationId);

    if (res.success) {
      if (res.conversationId) setConversationId(res.conversationId);
      setHistory([...newHistory, { role: 'assistant', content: res.data || 'Empty response' }]);
    } else {
      setHistory([...newHistory, { role: 'assistant', content: 'Error: ' + res.error }]);
    }

    setLoading(false);
  };

  const suggestions = [
    "What are my tasks today?",
    "Which leads need follow-up?",
    "Show critical incidents",
    "What changed today?"
  ];

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
        aria-expanded={isOpen}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center p-4 rounded-full shadow-lg transition-all duration-300",
          isOpen ? "bg-muted text-muted-foreground scale-90 opacity-0 pointer-events-none" : "bg-primary text-primary-foreground hover:scale-105"
        )}
      >
        <Sparkles className="w-6 h-6" />
      </button>

      {/* Popup Window */}
      <div
        role="dialog"
        aria-label="AI Assistant"
        className={cn(
          "fixed z-50 flex flex-col bg-background border shadow-2xl transition-all duration-300 ease-in-out sm:rounded-2xl overflow-hidden",
          isOpen
            ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-y-12 opacity-0 scale-95 pointer-events-none",
          isExpanded
            ? "inset-0 sm:inset-6 md:inset-12 lg:inset-y-12 lg:right-12 lg:left-auto lg:w-[800px]" // Expanded mode
            : "bottom-0 right-0 top-0 w-full sm:top-auto sm:bottom-6 sm:right-6 sm:w-[400px] sm:h-[600px]" // Default mode
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
          <div className="flex items-center gap-2 font-semibold">
            <Bot className="w-5 h-5 text-primary" />
            <span>AI Assistant</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1.5 rounded-md hover:bg-muted hidden sm:block text-muted-foreground transition-colors"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground p-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">How can I help you today?</h3>
                <p className="text-sm mt-1">Ask me anything about your CRM data, tasks, leads, or security incidents.</p>
              </div>
              
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(s)}
                    disabled={loading}
                    className="text-xs bg-background border hover:bg-muted px-3 py-1.5 rounded-full transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, idx) => (
            <div key={idx} className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  "max-w-[85%] p-3 rounded-2xl text-sm",
                  msg.role === 'user'
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm border"
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted text-foreground p-3 rounded-2xl rounded-bl-sm border flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(prompt); }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Ask a question..."
              className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full px-4 py-2.5 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="bg-primary text-primary-foreground p-2.5 rounded-full hover:bg-primary/90 disabled:opacity-50 transition-colors"
              aria-label="Send message"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </form>
          
          {history.length > 0 && (
            <div className="flex justify-center mt-3">
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  setConversationId(undefined);
                }}
                disabled={loading}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Start a new conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
