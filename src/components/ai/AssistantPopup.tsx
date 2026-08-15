'use client';
import { useState, useRef, useEffect } from 'react';
import { askAssistantAction } from '@/modules/ai/actions/assistant.actions';
import { X, Maximize2, Minimize2, MessageSquare, Loader2, Sparkles, Send } from 'lucide-react';
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
  ];

  return (
    <>
      {/* ─── Floating Sparkle Button ─── */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle AI Assistant"
        aria-expanded={isOpen}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center justify-center w-13 h-13 rounded-full shadow-lg transition-all duration-300",
          "grad-primary ring-glow float-slow",
          isOpen ? "scale-90 opacity-0 pointer-events-none" : "scale-100 opacity-100 hover:scale-105"
        )}
        style={{ width: 52, height: 52 }}
      >
        <Sparkles className="w-6 h-6 text-white" />
      </button>

      {/* ─── Chat Window ─── */}
      <div
        role="dialog"
        aria-label="AI Assistant"
        className={cn(
          "fixed z-50 flex flex-col transition-all duration-300 ease-in-out",
          "rounded-[1.25rem] overflow-hidden",
          "border border-white/[.08]",
          isOpen
            ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-y-12 opacity-0 scale-95 pointer-events-none",
          isExpanded
            ? "inset-4 sm:inset-8 lg:inset-y-12 lg:right-8 lg:left-auto lg:w-[700px]"
            : "bottom-0 right-0 top-0 w-full sm:top-auto sm:bottom-6 sm:right-6 sm:w-[420px] sm:h-[580px]"
        )}
        style={{
          background: "linear-gradient(180deg, rgba(20,27,51,.95), rgba(7,11,24,.95))",
          boxShadow: "0 32px 80px rgba(0,0,0,.7)",
          backdropFilter: "blur(28px)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b border-white/[.06]"
          style={{ background: "rgba(13,19,38,.6)" }}
        >
          <div className="flex items-center gap-2">
            {/* Violet glow icon */}
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(124,92,252,.15)" }}
            >
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#7C5CFC" }} />
            </div>
            <div>
              <p className="font-display font-semibold text-sm text-white">Nexus AI</p>
              <p className="text-[10px]" style={{ color: "#22D3EE" }}>
                <span className="nav-pulse-dot inline-block mr-1" />
                Online
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all hidden sm:flex"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white transition-all"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 pb-4">
              {/* Idle glow icon */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(124,92,252,.12)" }}
              >
                <Sparkles className="w-7 h-7" style={{ color: "#7C5CFC" }} />
              </div>
              <div>
                <p className="font-display font-bold text-white">How can I help?</p>
                <p className="text-xs mt-1" style={{ color: "#8891B0" }}>
                  Ask about leads, tasks, incidents, or anything in your CRM.
                </p>
              </div>
              {/* Suggestion chips */}
              <div className="flex flex-wrap justify-center gap-2 mt-1">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSend(s)}
                    disabled={loading}
                    className="chip glass text-[11px] hover:border-violet-400 hover:text-violet-300 transition-all"
                    style={{ color: "#8891B0" }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex animate-in",
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  "max-w-[82%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'user'
                    ? "rounded-tr-sm text-white"
                    : "rounded-tl-sm glass"
                )}
                style={
                  msg.role === 'user'
                    ? { background: "rgba(124,92,252,.2)", border: "1px solid rgba(124,92,252,.3)" }
                    : {}
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start animate-in">
              <div className="glass px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#7C5CFC" }} />
                <span className="text-xs" style={{ color: "#8891B0" }}>Thinking…</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div
          className="p-3 border-t border-white/[.06]"
          style={{ background: "rgba(13,19,38,.5)" }}
        >
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
              placeholder="Ask me anything…"
              className="flex-1 text-sm"
              style={{
                background: "rgba(20,27,51,.55)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: ".7rem",
                padding: ".55rem .85rem",
                color: "#E7EAF5",
                outline: "none",
              }}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-lg grad-primary text-white disabled:opacity-40 hover:brightness-110 transition-all"
              aria-label="Send"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {history.length > 0 && (
            <div className="flex justify-center mt-2">
              <button
                type="button"
                onClick={() => { setHistory([]); setConversationId(undefined); }}
                disabled={loading}
                className="text-[11px] transition-colors hover:text-violet-400"
                style={{ color: "#8891B0" }}
              >
                Start new conversation
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
