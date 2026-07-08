'use client';
import { useState, useCallback, useRef, useEffect } from 'react';

export default function Terminal({ output, onClose, onRunWithInput, onSendStdin, onClear, onKill, socket, onDiagnoseError }) {
  const [height, setHeight] = useState(200);
  const [activeTab, setActiveTab] = useState('runner'); 
  const [stdinInput, setStdinInput] = useState('');
  const [shellInput, setShellInput] = useState('');
  const [shellOutput, setShellOutput] = useState('');

  const isDragging = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const scrollRef = useRef(null);
  const shellScrollRef = useRef(null);

  
  useEffect(() => {
    if (activeTab === 'runner' && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    } else if (activeTab === 'shell' && shellScrollRef.current) {
      shellScrollRef.current.scrollTop = shellScrollRef.current.scrollHeight;
    }
  }, [output, shellOutput, activeTab]);

  
  useEffect(() => {
    if (!socket || activeTab !== 'shell') return;

    
    socket.emit('terminal-init');

    const handleOutput = (data) => {
      setShellOutput(prev => prev + data);
    };

    socket.on('terminal-output', handleOutput);

    return () => {
      socket.off('terminal-output', handleOutput);
    };
  }, [socket, activeTab]);

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDragging.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(ev) {
      if (!isDragging.current) return;
      const delta = startY.current - ev.clientY;
      const newHeight = Math.max(100, Math.min(600, startHeight.current + delta));
      setHeight(newHeight);
    }

    function onMouseUp() {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [height]);

  const handleRunnerSubmit = (e) => {
    e.preventDefault();
    if (output?.running) {
      if (onSendStdin) onSendStdin(stdinInput);
      setStdinInput('');
    } else {
      if (onRunWithInput) onRunWithInput(stdinInput);
    }
  };

  const handleShellSubmit = (e) => {
    e.preventDefault();
    if (!shellInput.trim()) return;
    if (socket) {
      socket.emit('terminal-input', shellInput + '\n');
    }
    setShellInput('');
  };

  const handleRunnerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleRunnerSubmit(e);
    }
  };

  const handleShellKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleShellSubmit(e);
    }
  };

  const clearShell = () => {
    setShellOutput('');
    if (socket) {
      socket.emit('terminal-init');
    }
  };

  return (
    <div
      className="border-t border-brand-border flex flex-col shrink-0"
      style={{ height: `${height}px`, backgroundColor: 'var(--base)' }}
    >
      {}
      <div
        onMouseDown={handleMouseDown}
        className="h-1 cursor-ns-resize hover:bg-brand-accent shrink-0 transition-colors"
        style={{ backgroundColor: 'var(--border)' }}
      />

      {}
      <div
        className="h-7 px-3 flex items-center justify-between border-b border-brand-border shrink-0"
        style={{ backgroundColor: 'var(--surface-1)' }}
      >
        {}
        <div className="flex gap-2 h-full items-center">
          <button
            onClick={() => setActiveTab('runner')}
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border transition-colors cursor-pointer
              ${activeTab === 'runner'
                ? 'border-brand-accent text-brand-accent bg-brand-accentMuted'
                : 'border-transparent text-brand-text3 hover:text-brand-text2'}`}
            style={activeTab === 'runner' ? { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-muted)' } : {}}
          >
            Runner Output
          </button>
          <button
            onClick={() => setActiveTab('shell')}
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 border transition-colors cursor-pointer
              ${activeTab === 'shell'
                ? 'border-brand-accent text-brand-accent bg-brand-accentMuted'
                : 'border-transparent text-brand-text3 hover:text-brand-text2'}`}
            style={activeTab === 'shell' ? { borderColor: 'var(--accent)', color: 'var(--accent)', backgroundColor: 'var(--accent-muted)' } : {}}
          >
            Interactive CLI
          </button>
        </div>

        {}
        <div className="flex items-center gap-2">
          {activeTab === 'runner' ? (
            <>
              {onKill && (
                <button
                  onClick={onKill}
                  disabled={!output?.running}
                  className="text-[9px] font-mono px-1.5 py-0.5 border border-brand-error/40 hover:border-brand-error text-brand-error hover:bg-brand-error/10 disabled:opacity-30 disabled:pointer-events-none transition-colors rounded-sm cursor-pointer"
                  title="Force stop execution"
                >
                  Stop
                </button>
              )}
              {onClear && (
                <button
                  onClick={onClear}
                  className="text-[9px] font-mono px-1.5 py-0.5 border border-brand-border text-brand-text3 hover:text-brand-text1 transition-colors rounded-sm cursor-pointer"
                  title="Clear output"
                >
                  Clear
                </button>
              )}
            </>
          ) : (
            <button
              onClick={clearShell}
              className="text-[9px] font-mono px-1.5 py-0.5 border border-brand-border text-brand-text3 hover:text-brand-text1 transition-colors rounded-sm cursor-pointer"
              title="Reset terminal"
            >
              Reset CLI
            </button>
          )}

          <button
            onClick={() => setHeight(h => Math.min(600, h + 100))}
            className="text-[10px] text-brand-text3 hover:text-brand-text1 font-mono cursor-pointer"
            title="Expand"
          >▲</button>
          <button
            onClick={() => setHeight(h => Math.max(100, h - 100))}
            className="text-[10px] text-brand-text3 hover:text-brand-text1 font-mono cursor-pointer"
            title="Shrink"
          >▼</button>
          <button onClick={onClose} className="text-xs text-brand-text3 hover:text-brand-text1 cursor-pointer" title="Close">×</button>
        </div>
      </div>

      {}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {activeTab === 'runner' ? (
          
          <div
            ref={scrollRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflowY: 'auto',
              padding: '12px',
              backgroundColor: 'var(--base)',
            }}
            className="font-mono text-xs"
          >
            {!output && (
              <div className="text-brand-text3">
                <span className="mr-1" style={{ color: 'var(--success)' }}>$</span> Ready. Click <span style={{ color: 'var(--accent)' }}>▶ Run</span> to execute the current file.
              </div>
            )}
            {output?.running && (
              <div className="text-brand-text3">
                <span className="mr-1" style={{ color: 'var(--success)' }}>$</span> Running<span className="animate-cursor-blink">▌</span>
              </div>
            )}
            {output?.stdout && (
              <pre className="text-brand-text1 whitespace-pre-wrap">{output.stdout}</pre>
            )}
            {output?.stderr && (
              <pre className="whitespace-pre-wrap" style={{ color: 'var(--error)' }}>{output.stderr}</pre>
            )}
            {output && !output.running && (
              <div className="mt-2 pt-2 border-t border-brand-border text-brand-text3 text-[10px] flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span>Exit: {output.exitCode}</span>
                  <span>·</span>
                  <span>{output.executionTime}ms</span>
                  {output.memoryUsage > 0 && (
                    <>
                      <span>·</span>
                      <span>{(output.memoryUsage / 1024 / 1024).toFixed(2)} MB</span>
                    </>
                  )}
                </div>
                {output.exitCode !== 0 && onDiagnoseError && (
                  <button
                    onClick={() => onDiagnoseError(output.stderr)}
                    className="px-2 py-0.5 border border-brand-error text-brand-error bg-brand-error/10 hover:bg-brand-error hover:text-brand-base transition-colors rounded-sm cursor-pointer"
                    style={{ borderColor: 'var(--error)', color: 'var(--error)' }}
                  >
                    💡 Explain Error
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          
          <div
            ref={shellScrollRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflowY: 'auto',
              padding: '12px',
              backgroundColor: 'var(--base)',
            }}
            className="font-mono text-xs text-brand-text2"
          >
            {shellOutput ? (
              <pre className="whitespace-pre-wrap">{shellOutput}</pre>
            ) : (
              <div className="text-brand-text3">
                <span className="mr-1" style={{ color: 'var(--accent)' }}>$</span> Shell ready. Type command at the bottom to execute (e.g. `npm install`, `ls`, `python --version`).
              </div>
            )}
          </div>
        )}
      </div>

      {}
      {activeTab === 'runner' ? (
        
        <form
          onSubmit={handleRunnerSubmit}
          className="shrink-0 px-2 py-1.5 border-t border-brand-border flex items-start gap-2"
          style={{ backgroundColor: 'var(--surface-1)' }}
        >
          <span className="text-[10px] font-mono text-brand-text3 shrink-0 mt-1">stdin:</span>
          <textarea
            value={stdinInput}
            onChange={e => setStdinInput(e.target.value)}
            onKeyDown={handleRunnerKeyDown}
            rows={Math.min(4, stdinInput.split('\n').length || 1)}
            placeholder={output?.running ? "Type input (Enter to Send, Shift+Enter for new line)..." : "Paste input (e.g. multi-line competitive programming input)..."}
            className="flex-1 px-2 py-1 text-xs font-mono text-brand-text1 border border-brand-border placeholder:text-brand-text3 focus:outline-none resize-none"
            style={{ backgroundColor: 'var(--base)' }}
          />
          <button
            type="submit"
            className="px-2 py-1 text-[10px] font-mono shrink-0 mt-0.5 cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
          >
            {output?.running ? 'Send' : '▶ Run'}
          </button>
        </form>
      ) : (
        
        <form
          onSubmit={handleShellSubmit}
          className="shrink-0 px-2 py-1.5 border-t border-brand-border flex items-center gap-2"
          style={{ backgroundColor: 'var(--surface-1)' }}
        >
          <span className="text-xs font-mono text-brand-accent shrink-0" style={{ color: 'var(--accent)' }}>$</span>
          <input
            value={shellInput}
            onChange={e => setShellInput(e.target.value)}
            onKeyDown={handleShellKeyDown}
            placeholder="Type command and press Enter..."
            className="flex-1 px-2 py-1 text-xs font-mono text-brand-text1 border border-brand-border placeholder:text-brand-text3 focus:outline-none"
            style={{ backgroundColor: 'var(--base)' }}
          />
          <button
            type="submit"
            className="px-3 py-1 text-[10px] font-mono shrink-0 cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
          >
            Run
          </button>
        </form>
      )}
    </div>
  );
}
