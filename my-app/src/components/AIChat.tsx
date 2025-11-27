import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './AIChat.css';

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  pending?: boolean; // for optimistic UI while waiting
  error?: boolean;   // mark if failed
}

interface AIChatProps {
  className?: string;
}

const AIChat: React.FC<AIChatProps> = ({ className }) => {
  const [chatMessages, setChatMessages] = useState<Message[]>([
    { id: 1, role: 'assistant', content: 'Hi! I\'m Mosaic AI. Ask me about study topics, notes, or anything technical.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pulledChunks, setPulledChunks] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, loading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    const trimmed = chatInput.trim();
    if (!trimmed) return;
    setError(null);

    const userMsg: Message = { id: Date.now(), role: 'user', content: trimmed };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setAttachedFiles([]); // not yet sending files
    setLoading(true);

    // Build conversation for backend (exclude pending or error flags)
    const payloadMessages = [...chatMessages, userMsg].map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${API_BASE}/chatbot/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payloadMessages }),
        credentials: 'include',
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Error ${res.status}`);
      }
      const data: { reply: string; contexts?: any[] } = await res.json();
      const assistantMsg: Message = { id: Date.now() + 1, role: 'assistant', content: data.reply };
      setChatMessages(prev => [...prev, assistantMsg]);
      if (data.contexts && Array.isArray(data.contexts)) {
        setPulledChunks(data.contexts);
      } else {
        setPulledChunks([]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response');
      const failMsg: Message = { id: Date.now() + 2, role: 'assistant', content: 'Sorry, I had an issue answering that.', error: true };
      setChatMessages(prev => [...prev, failMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) {
      setAttachedFiles(prev => {
        const existing = new Set(prev.map(f => f.name + f.size));
        const uniques = files.filter(f => !existing.has(f.name + f.size));
        return [...prev, ...uniques];
      });
    }
    e.currentTarget.value = '';
  };

  const handleAttachClick = () => {
    const el = document.getElementById('ai-file-input') as HTMLInputElement | null;
    el?.click();
  };

  return (
    <div className={`ai-chat-container ${className || ''}`}>
      <div className="ai-messages">
        {chatMessages.map((m, idx) => (
          <div key={m.id} className={`ai-message ${m.role} ${m.error ? 'error' : ''}`}>
            <div className="bubble">
              {m.role === 'assistant' ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              ) : (
                m.content
              )}
            </div>

            {/* If this is the latest assistant message and we have pulledChunks, render a styled Sources block */}
            {m.role === 'assistant' && idx === chatMessages.length - 1 && pulledChunks.length > 0 && (
              <div className="ai-references" aria-live="polite">
                <div className="ai-references-title">Sources</div>
                <ul className="ai-references-list">
                  {pulledChunks.map((c, i) => (
                    <li key={i} className="ai-reference-item">{c.source || 'unknown'}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {/* Only show Sources under the assistant message; no separate retrieved panel */}
        {loading && (
          <div className="ai-message assistant loading">
            <div className="bubble">
              <span className="typing-dots" aria-hidden>
                <span></span>
                <span></span>
                <span></span>
              </span>
              <span className="sr-only">Thinking…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <form className="ai-input-row" onSubmit={handleSubmit}>
        <input
          id="ai-file-input"
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          className="ai-attach"
          type="button"
          aria-label="Attach files"
          title={attachedFiles.length ? `${attachedFiles.length} file(s) selected` : 'Attach files'}
          onClick={handleAttachClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 1 1-8.49-8.49l9.19-9.19a4 4 0 1 1 5.66 5.66l-9.2 9.19a2 2 0 1 1-2.83-2.83l8.49-8.48" />
          </svg>
          {attachedFiles.length > 0 && (
            <span className="ai-attach-count" aria-hidden>{attachedFiles.length}</span>
          )}
        </button>
        <input
          className="ai-input"
          placeholder={loading ? 'Waiting for response...' : 'Message Mosaic AI...'}
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={loading}
        />
        <button className="ai-send" type="submit" aria-label="Send" disabled={loading}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13" />
            <path d="M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </form>
      {error && <div className="ai-error" role="alert">{error}</div>}
    </div>
  );
};

export default AIChat;