'use client';
import { useState, useEffect, useRef } from 'react';

export default function ChatPanel({ roomId, socket, user }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState([]);
  const messagesRef = useRef(null);
  const typingTimeout = useRef(null);

  // Load history
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/chat/${roomId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('codecollab-token')}` }
        });
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
      } catch (e) { /* ignore */ }
    }
    if (roomId) load();
  }, [roomId]);

  // Listen for new messages
  useEffect(() => {
    if (!socket) return;

    const handleMsg = (msg) => {
      setMessages(prev => {
        // Avoid duplicates by checking if ID already exists
        if (msg.id && prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const handleTypingStart = ({ username }) => {
      setTyping(prev => prev.includes(username) ? prev : [...prev, username]);
    };

    const handleTypingStop = ({ username, userId }) => {
      // Remove by username (the server sends username in typing-start)
      setTyping(prev => prev.filter(u => u !== username && u !== userId));
    };

    socket.on('chat-message', handleMsg);
    socket.on('typing-start', handleTypingStart);
    socket.on('typing-stop', handleTypingStop);

    return () => {
      socket.off('chat-message', handleMsg);
      socket.off('typing-start', handleTypingStart);
      socket.off('typing-stop', handleTypingStop);
    };
  }, [socket]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
    }
  }, [messages]);

  function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || !socket) return;
    socket.emit('chat-message', { roomId, content: input, type: 'text' });
    setInput('');
    socket.emit('typing-stop');
  }

  function handleTyping(val) {
    setInput(val);
    if (socket) {
      socket.emit('typing-start');
      clearTimeout(typingTimeout.current);
      typingTimeout.current = setTimeout(() => socket.emit('typing-stop'), 1000);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div
        style={{
          height: '32px',
          padding: '0 12px',
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--surface-1)',
          flexShrink: 0,
        }}
      >
        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-text3">Chat</span>
        <span className="ml-auto text-[9px] text-brand-text3 font-mono">{messages.length}</span>
      </div>

      {/* Messages — absolute positioned to fill remaining space */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div
          ref={messagesRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            overflowY: 'auto',
            padding: '12px',
          }}
        >
          <div className="space-y-3">
            {messages.length === 0 && (
              <p className="text-xs text-brand-text3 text-center py-4">No messages yet</p>
            )}
            {messages.map((msg, i) => {
              const isOwn = msg.user_id === user?.id;
              const displayName = msg.username || 'Unknown';
              return (
                <div key={msg.id || i} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="w-5 h-5 shrink-0 flex items-center justify-center text-[9px] font-bold"
                    style={{ backgroundColor: msg.avatar_color || 'var(--accent)', color: 'var(--base)' }}
                  >
                    {displayName[0].toUpperCase()}
                  </div>
                  <div className={`max-w-[80%] ${isOwn ? 'text-right' : ''}`}>
                    <div className={`flex items-center gap-2 mb-0.5 ${isOwn ? 'justify-end' : ''}`}>
                      <span className="text-[10px] font-medium text-brand-text2">{displayName}</span>
                      <span className="text-[9px] text-brand-text3">
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <div
                      className={`text-xs leading-relaxed px-2 py-1.5 border border-brand-border ${msg.type === 'code' ? 'font-mono' : ''}`}
                      style={{ backgroundColor: isOwn ? 'var(--accent-muted)' : 'var(--surface-1)' }}
                    >
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })}
            {typing.length > 0 && (
              <div className="text-[10px] text-brand-text3 italic">
                {typing.join(', ')} typing<span className="animate-cursor-blink">▌</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        style={{
          borderTop: '1px solid var(--border)',
          padding: '8px',
          backgroundColor: 'var(--surface-1)',
          flexShrink: 0,
        }}
      >
        <input
          value={input}
          onChange={(e) => handleTyping(e.target.value)}
          placeholder="Send a message..."
          className="w-full px-2 py-1.5 border border-brand-border text-xs text-brand-text1 placeholder:text-brand-text3 focus:outline-none"
          style={{ backgroundColor: 'var(--base)' }}
        />
      </form>
    </div>
  );
}
