'use client';
import { useState, useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export default function AIPanel({ projectId, activeFile, prefilledPrompt, prefilledMode }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('ask'); // ask | explain | debug | tests | optimize | refactor | review | document | flowchart
  const messagesEndRef = useRef(null);

  const modes = [
    { id: 'ask', label: 'Ask', desc: 'Ask about your project (RAG)' },
    { id: 'explain', label: 'Explain', desc: 'Explain selected code' },
    { id: 'debug', label: 'Debug', desc: 'Find and fix bugs' },
    { id: 'tests', label: 'Tests', desc: 'Generate unit tests' },
    { id: 'optimize', label: 'Optimize', desc: 'Performance optimization' },
    { id: 'refactor', label: 'Refactor', desc: 'Clean up code' },
    { id: 'review', label: 'Review', desc: 'Code review' },
    { id: 'document', label: 'Docs', desc: 'Generate documentation' },
    { id: 'flowchart', label: 'Flowchart', desc: 'Generate logic flow diagram' },
  ];

  // Auto-scroll to bottom when messages or loading state changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Handle prefilled prompts (e.g. from Explain Error button)
  useEffect(() => {
    if (prefilledPrompt && prefilledMode) {
      setMode(prefilledMode);
      setInput(`Explain this error: ${prefilledPrompt}`);
    }
  }, [prefilledPrompt, prefilledMode]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (loading) return;

    const question = input.trim() || (mode !== 'ask' ? `${mode} this code` : '');
    if (!question && mode === 'ask') return;

    setLoading(true);
    setMessages(prev => [...prev, { role: 'user', content: mode === 'ask' ? question : `[${mode.toUpperCase()}] ${activeFile?.name || 'code'}` }]);
    setInput('');

    try {
      let data;
      if (mode === 'ask') {
        data = await api.post('/api/ai/ask', { question, projectId });
      } else {
        const code = activeFile?.content || '';
        const lang = activeFile?.language || '';
        console.log('AIPanel handleSubmit - submitting code:', code, 'language:', lang);
        const endpoint = mode === 'tests' ? 'generate-tests' : mode;
        data = await api.post(`/api/ai/${endpoint}`, { code, language: lang, question, error: input });
      }
      setMessages(prev => [...prev, { role: 'ai', content: data.answer }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  // Simple, elegant client-side Markdown rendering
  function renderMarkdown(text) {
    if (!text) return null;

    const lines = text.split('\n');
    const elements = [];
    let codeBlock = [];
    let isInsideCode = false;
    let codeLang = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Check code blocks
      if (line.trim().startsWith('```')) {
        if (isInsideCode) {
          if (codeLang === 'mermaid') {
            const chartCode = codeBlock.join('\n');
            let encodedChart = '';
            try {
              encodedChart = btoa(unescape(encodeURIComponent(chartCode.trim())));
            } catch (e) {}

            if (encodedChart) {
              elements.push(
                <div key={`chart-${i}`} className="my-2 border border-brand-border rounded p-2 bg-white flex flex-col items-center shrink-0">
                  <img
                    src={`https://mermaid.ink/img/${encodedChart}`}
                    alt="Flowchart diagram"
                    className="max-w-full h-auto object-contain"
                  />
                  <span className="text-[9px] text-gray-500 font-mono mt-1">Rendered Flowchart (Mermaid.js)</span>
                </div>
              );
            }
          } else {
            elements.push(
              <pre key={`code-${i}`} className="bg-brand-base p-2 border border-brand-border font-mono text-[11px] overflow-x-auto my-2 rounded-sm" style={{ backgroundColor: 'var(--base)' }}>
                <code className="text-brand-text1">{codeBlock.join('\n')}</code>
              </pre>
            );
          }
          codeBlock = [];
          isInsideCode = false;
        } else {
          isInsideCode = true;
          codeLang = line.replace('```', '').trim();
        }
        continue;
      }

      if (isInsideCode) {
        codeBlock.push(line);
        continue;
      }

      // Check headers
      if (line.startsWith('#')) {
        const match = line.match(/^(#{1,6})\s+(.*)$/);
        if (match) {
          const level = match[1].length;
          const headingText = parseInlineMarkdown(match[2]);
          const Tag = level <= 6 ? `h${level}` : 'h6';
          elements.push(
            <Tag key={`h-${i}`} className={`font-semibold text-brand-text1 mt-3 mb-1 ${level === 1 ? 'text-sm border-b border-brand-border pb-0.5' : level === 2 ? 'text-xs' : 'text-[11px]'}`} style={{ color: 'var(--accent)' }}>
              {headingText}
            </Tag>
          );
          continue;
        }
      }

      // Check lists
      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
        const listContent = line.replace(/^\s*[\-\*]\s+/, '');
        elements.push(
          <ul key={`ul-${i}`} className="list-disc pl-4 space-y-0.5 my-0.5">
            <li className="text-brand-text2">{parseInlineMarkdown(listContent)}</li>
          </ul>
        );
        continue;
      }

      // Paragraph
      if (line.trim() === '') {
        elements.push(<div key={`space-${i}`} className="h-1.5" />);
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-brand-text2 leading-relaxed my-0.5">
            {parseInlineMarkdown(line)}
          </p>
        );
      }
    }

    return elements;
  }

  function parseInlineMarkdown(text) {
    const parts = [];
    let remaining = text;
    
    while (remaining) {
      const boldIndex = remaining.indexOf('**');
      const codeIndex = remaining.indexOf('`');
      
      if (boldIndex === -1 && codeIndex === -1) {
        parts.push(remaining);
        break;
      }
      
      if (boldIndex !== -1 && (codeIndex === -1 || boldIndex < codeIndex)) {
        if (boldIndex > 0) {
          parts.push(remaining.substring(0, boldIndex));
        }
        const rest = remaining.substring(boldIndex + 2);
        const closeIndex = rest.indexOf('**');
        if (closeIndex === -1) {
          parts.push(remaining.substring(boldIndex));
          break;
        }
        parts.push(
          <strong key={`b-${remaining.length}`} className="font-semibold text-brand-text1">
            {rest.substring(0, closeIndex)}
          </strong>
        );
        remaining = rest.substring(closeIndex + 2);
      } else {
        if (codeIndex > 0) {
          parts.push(remaining.substring(0, codeIndex));
        }
        const rest = remaining.substring(codeIndex + 1);
        const closeIndex = rest.indexOf('`');
        if (closeIndex === -1) {
          parts.push(remaining.substring(codeIndex));
          break;
        }
        parts.push(
          <code key={`c-${remaining.length}`} className="bg-brand-surface2 px-1 border border-brand-border rounded font-mono text-[10px] text-brand-text1" style={{ backgroundColor: 'var(--surface-2)' }}>
            {rest.substring(0, closeIndex)}
          </code>
        );
        remaining = rest.substring(closeIndex + 1);
      }
    }
    
    return parts;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="h-8 px-3 flex items-center border-b border-brand-border shrink-0" style={{ backgroundColor: 'var(--surface-1)' }}>
        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-text3">AI Assistant</span>
      </div>

      {/* Mode selector */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-brand-border shrink-0" style={{ backgroundColor: 'var(--surface-1)' }}>
        {modes.map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            title={m.desc}
            className={`px-2 py-0.5 text-[10px] font-mono border transition-colors cursor-pointer
              ${mode === m.id
                ? 'border-brand-accent text-brand-accent bg-brand-accentMuted'
                : 'border-brand-border text-brand-text3 hover:text-brand-text2'
              }`}
            style={mode === m.id ? { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-muted)' } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Messages area — absolute positioned container to ensure scrolling works */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div
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
              <div className="text-center py-8">
                <p className="text-xs text-brand-text3 mb-1">
                  {mode === 'ask' ? 'Ask about your project code' : `Select code and click ${mode}`}
                </p>
                <p className="text-[10px] text-brand-text3">Powered by Gemini 2.5 Flash + RAG</p>
              </div>
            )}
            {messages.map((msg, i) => {
              const trimmedContent = msg.content.trim();
              const isRawMermaid = msg.role === 'ai' && (trimmedContent.startsWith('graph ') || trimmedContent.startsWith('flowchart '));
              let encodedRawChart = '';
              if (isRawMermaid) {
                try {
                  encodedRawChart = btoa(unescape(encodeURIComponent(trimmedContent)));
                } catch (e) {}
              }

              return (
                <div key={i} className={`text-xs ${msg.role === 'user' ? 'text-right' : ''}`}>
                  <div className="text-[10px] text-brand-text3 mb-1 font-mono">
                    {msg.role === 'user' ? 'you' : 'ai'}
                  </div>
                  <div className={`px-3 py-2 border text-left leading-relaxed
                    ${msg.role === 'ai' ? 'bg-brand-surface1 border-brand-border' : 'bg-brand-accentMuted border-brand-border whitespace-pre-wrap font-mono'}`}
                    style={msg.role === 'user' ? { borderColor: 'var(--accent)', backgroundColor: 'var(--accent-muted)' } : {}}
                  >
                    {msg.role === 'ai' ? (
                      isRawMermaid && encodedRawChart ? (
                        <div className="my-1 border border-brand-border rounded p-2 bg-white flex flex-col items-center shrink-0">
                          <img
                            src={`https://mermaid.ink/img/${encodedRawChart}`}
                            alt="Flowchart diagram"
                            className="max-w-full h-auto object-contain"
                          />
                          <span className="text-[9px] text-gray-500 font-mono mt-1">Rendered Flowchart (Mermaid.js)</span>
                        </div>
                      ) : (
                        renderMarkdown(msg.content)
                      )
                    ) : (
                      msg.content
                    )}
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="text-xs text-brand-text3 italic">
                Thinking<span className="animate-cursor-blink">▌</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t border-brand-border p-2 shrink-0" style={{ backgroundColor: 'var(--surface-1)' }}>
        <div className="flex gap-1">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === 'ask' ? 'Ask about your code...' : `Describe what to ${mode}...`}
            className="flex-1 px-2 py-1.5 border border-brand-border text-xs text-brand-text1 placeholder:text-brand-text3 focus:outline-none"
            style={{ backgroundColor: 'var(--base)' }}
          />
          <button
            type="submit"
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium shrink-0 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
          >
            {mode === 'ask' ? '→' : '▶'}
          </button>
        </div>
      </form>
    </div>
  );
}
