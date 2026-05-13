import { useState, useRef, useEffect } from 'react';
import { Send, Trash2, FileText, RefreshCw, User, Bot, Info } from 'lucide-react';

const NOT_AVAILABLE_PHRASE = 'not available in document';

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  const isNotAvailable = !isUser && msg.content.toLowerCase().includes(NOT_AVAILABLE_PHRASE);

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm
        ${isUser ? 'bg-brand-500' : 'bg-slate-700'}`}>
        {isUser
          ? <User className="w-4 h-4 text-white" />
          : <Bot className="w-4 h-4 text-white" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
        ${isUser
          ? 'bg-brand-500 text-white rounded-tr-sm'
          : isNotAvailable
            ? 'bg-amber-50 text-amber-800 border border-amber-200 rounded-tl-sm'
            : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
        }`}>
        {isNotAvailable && (
          <div className="flex items-center gap-1.5 mb-1 font-semibold text-amber-600 text-xs">
            <Info className="w-3.5 h-3.5" /> Not found in document
          </div>
        )}
        <p className="whitespace-pre-wrap">{msg.content}</p>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center shadow-sm">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
          <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
          <span className="typing-dot w-2 h-2 bg-slate-400 rounded-full inline-block" />
        </div>
      </div>
    </div>
  );
}

export default function ChatInterface({ sessionId, filename, onReset }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setError('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to get answer.');

      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer }]);
    } catch (err) {
      setError(err.message);
      setMessages((prev) => prev.slice(0, -1)); // remove optimistic user msg
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const clearHistory = async () => {
    try {
      await fetch('/api/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
      setMessages([]);
      setError('');
    } catch {
      setError('Could not clear history.');
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-white shadow-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-brand-50">
            <FileText className="w-5 h-5 text-brand-500" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 truncate text-sm">{filename}</p>
            <p className="text-xs text-slate-400">Answers strictly from document</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearHistory}
              title="Clear chat history"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onReset}
            title="Upload new PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
              text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            New PDF
          </button>
        </div>
      </header>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 scrollbar-thin">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Bot className="w-8 h-8 text-slate-300" />
            </div>
            <div>
              <p className="font-medium text-slate-500">Ready to answer questions</p>
              <p className="text-sm mt-1">Ask anything about <span className="font-semibold text-slate-600">{filename}</span></p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 justify-center max-w-sm">
              {['What is this document about?', 'Summarize the key points', 'What are the main topics covered?'].map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-3 py-1.5 text-xs rounded-full border border-slate-200 bg-white text-slate-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} msg={msg} />
        ))}

        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      {/* ── Error Banner ── */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
          {error}
        </div>
      )}

      {/* ── Input Bar ── */}
      <div className="px-4 py-4 bg-white border-t border-slate-200">
        <div className="flex items-end gap-3 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2 focus-within:border-brand-500 focus-within:bg-white transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask a question about the document…"
            rows={1}
            disabled={loading}
            className="flex-1 resize-none bg-transparent text-sm text-slate-800 placeholder-slate-400 outline-none py-1.5 max-h-36 scrollbar-thin"
            style={{ lineHeight: '1.5' }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="p-2 rounded-xl bg-brand-500 text-white hover:bg-brand-600 transition-all active:scale-95
              disabled:opacity-40 disabled:cursor-not-allowed mb-0.5 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">
          Responses are grounded strictly in the document · Enter to send
        </p>
      </div>
    </div>
  );
}
