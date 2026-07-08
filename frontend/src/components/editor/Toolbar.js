'use client';

export default function Toolbar({ onRun, onSave, onToggleFileTree, onToggleTerminal, rightPanel, onSetRightPanel, onToggleRightPanel, activeFile, showWhiteboard, onSelectWhiteboard }) {
  return (
    <div className="h-8 border-b border-brand-border flex items-center justify-between px-2 shrink-0 bg-brand-surface1" style={{ backgroundColor: 'var(--surface-1)' }}>
      <div className="flex items-center gap-1">
        <button
          onClick={onToggleFileTree}
          className="px-2 py-1 text-[10px] font-mono text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface2 transition-colors"
          title="Toggle file tree"
        >
          ▤ Files
        </button>
        <div className="w-px h-3 bg-brand-border mx-1" />
        <button
          onClick={onSave}
          disabled={!activeFile}
          className="px-2 py-1 text-[10px] font-mono text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface2 transition-colors disabled:opacity-30"
          title="Save (Ctrl+S)"
        >
          Save
        </button>
        <button
          onClick={onRun}
          disabled={!activeFile}
          className="px-2 py-1 text-[10px] font-mono hover:bg-brand-surface2 transition-colors disabled:opacity-30"
          style={{ color: 'var(--success)' }}
          title="Run code"
        >
          ▶ Run
        </button>
        <button
          onClick={onToggleTerminal}
          className="px-2 py-1 text-[10px] font-mono text-brand-text3 hover:text-brand-text1 hover:bg-brand-surface2 transition-colors"
          title="Toggle terminal"
        >
          ⊞ Terminal
        </button>
      </div>

      <div className="flex items-center gap-1">
        {activeFile && (
          <span className="text-[10px] text-brand-text3 font-mono mr-2">{activeFile.language}</span>
        )}
        <button
          onClick={() => onSetRightPanel('chat')}
          className={`px-2 py-1 text-[10px] font-mono transition-colors ${rightPanel === 'chat' ? '' : 'text-brand-text3 hover:text-brand-text1'}`}
          style={rightPanel === 'chat' ? { color: 'var(--accent)' } : {}}
        >
          Chat
        </button>
        <button
          onClick={() => onSetRightPanel('ai')}
          className={`px-2 py-1 text-[10px] font-mono transition-colors ${rightPanel === 'ai' ? '' : 'text-brand-text3 hover:text-brand-text1'}`}
          style={rightPanel === 'ai' ? { color: 'var(--accent)' } : {}}
        >
          AI
        </button>
        <button
          onClick={() => onSetRightPanel('review')}
          className={`px-2 py-1 text-[10px] font-mono transition-colors ${rightPanel === 'review' ? '' : 'text-brand-text3 hover:text-brand-text1'}`}
          style={rightPanel === 'review' ? { color: 'var(--accent)' } : {}}
        >
          Review
        </button>
        <button
          onClick={() => onSetRightPanel('dsa')}
          className={`px-2 py-1 text-[10px] font-mono transition-colors ${rightPanel === 'dsa' ? '' : 'text-brand-text3 hover:text-brand-text1'}`}
          style={rightPanel === 'dsa' ? { color: 'var(--accent)' } : {}}
        >
          DSA
        </button>
        <button
          onClick={onSelectWhiteboard}
          className={`px-2 py-1 text-[10px] font-mono transition-colors ${showWhiteboard ? '' : 'text-brand-text3 hover:text-brand-text1'}`}
          style={showWhiteboard ? { color: 'var(--accent)' } : {}}
        >
          Whiteboard
        </button>
        <button
          onClick={() => onSetRightPanel('history')}
          className={`px-2 py-1 text-[10px] font-mono transition-colors ${rightPanel === 'history' ? '' : 'text-brand-text3 hover:text-brand-text1'}`}
          style={rightPanel === 'history' ? { color: 'var(--accent)' } : {}}
        >
          History
        </button>
        <div className="w-px h-3 bg-brand-border mx-1" />
        <button
          onClick={onToggleRightPanel}
          className="px-2 py-1 text-[10px] font-mono text-brand-text3 hover:text-brand-text1 transition-colors"
        >
          ◧
        </button>
      </div>
    </div>
  );
}
