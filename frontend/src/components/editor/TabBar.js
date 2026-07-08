'use client';

export default function TabBar({ files, activeFileId, onSelect, onClose, showWhiteboard, onSelectWhiteboard }) {
  return (
    <div className="h-8 flex items-center bg-brand-surface1 border-b border-brand-border overflow-x-auto shrink-0" style={{ backgroundColor: 'var(--surface-1)' }}>
      {/* Persistent Whiteboard Tab */}
      <div
        className={`flex items-center gap-1.5 px-3 h-full border-r border-brand-border cursor-pointer text-xs shrink-0 transition-colors
          ${showWhiteboard ? 'bg-brand-base text-brand-text1' : 'text-brand-text3 hover:text-brand-text2 hover:bg-brand-surface2'}`}
        style={showWhiteboard ? { borderBottom: '1px solid var(--accent)' } : {}}
        onClick={onSelectWhiteboard}
      >
        <span className="font-semibold">🎨 Whiteboard</span>
      </div>

      {/* File Tabs */}
      {files && files.map(file => (
        <div
          key={file.id}
          className={`flex items-center gap-1.5 px-3 h-full border-r border-brand-border cursor-pointer text-xs shrink-0 transition-colors
            ${(!showWhiteboard && activeFileId === file.id) ? 'bg-brand-base text-brand-text1' : 'text-brand-text3 hover:text-brand-text2 hover:bg-brand-surface2'}`}
          style={(!showWhiteboard && activeFileId === file.id) ? { borderBottom: '1px solid var(--accent)' } : {}}
          onClick={() => {
            if (onSelect) onSelect(file.id);
          }}
        >
          <span className="font-mono">{file.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(file.id); }}
            className="text-brand-text3 hover:text-brand-text1 ml-1"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
