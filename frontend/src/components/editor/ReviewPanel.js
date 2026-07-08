'use client';
import { useState } from 'react';

export default function ReviewPanel({ comments, onAddComment, onDeleteComment, activeFile, onSelectLine }) {
  const [commentText, setCommentText] = useState('');
  const [selectedLine, setSelectedLine] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!commentText.trim() || !selectedLine) return;
    onAddComment(parseInt(selectedLine), commentText);
    setCommentText('');
    setSelectedLine('');
    setIsAdding(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="h-8 px-3 flex items-center justify-between border-b border-brand-border shrink-0" style={{ backgroundColor: 'var(--surface-1)' }}>
        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-text3">Code Review</span>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-[9px] font-mono border border-brand-border hover:border-brand-accent px-1.5 py-0.5 rounded-sm transition-colors cursor-pointer"
        >
          {isAdding ? 'Cancel' : '+ Comment'}
        </button>
      </div>

      {/* Add comment dialog */}
      {isAdding && (
        <form onSubmit={handleSubmit} className="p-3 border-b border-brand-border space-y-2 shrink-0 bg-brand-surface2" style={{ backgroundColor: 'var(--surface-2)' }}>
          <div>
            <label className="block text-[10px] uppercase font-mono text-brand-text3 mb-1">Line Number</label>
            <input
              type="number"
              min="1"
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              placeholder="e.g. 12"
              required
              className="w-full px-2 py-1 text-xs border border-brand-border text-brand-text1 placeholder:text-brand-text3 focus:outline-none"
              style={{ backgroundColor: 'var(--base)' }}
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase font-mono text-brand-text3 mb-1">Comment</label>
            <textarea
              rows="3"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your feedback here..."
              required
              className="w-full px-2 py-1 text-xs border border-brand-border text-brand-text1 placeholder:text-brand-text3 focus:outline-none resize-none"
              style={{ backgroundColor: 'var(--base)' }}
            />
          </div>
          <button
            type="submit"
            className="w-full py-1 text-xs font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
          >
            Save Comment
          </button>
        </form>
      )}

      {/* Comments List */}
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
          {!activeFile ? (
            <div className="text-center text-xs text-brand-text3 py-8">
              Open a file to view review comments.
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center text-xs text-brand-text3 py-8">
              No comments yet.<br />
              <span className="text-[10px] mt-1 block">Click a line number in the editor or click "+ Comment" above to add one.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map((c) => (
                <div
                  key={c.id}
                  className="border border-brand-border bg-brand-surface1 p-2 rounded-sm text-xs hover:border-brand-accent transition-colors"
                  style={{ backgroundColor: 'var(--surface-1)' }}
                >
                  {/* Metadata */}
                  <div className="flex items-center justify-between border-b border-brand-border pb-1 mb-1">
                    <span
                      onClick={() => onSelectLine && onSelectLine(c.line_number)}
                      className="font-mono font-medium hover:underline cursor-pointer"
                      style={{ color: 'var(--accent)' }}
                      title="Jump to line in editor"
                    >
                      Line {c.line_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-brand-text3 font-mono">by {c.username}</span>
                      <button
                        onClick={() => onDeleteComment(c.id)}
                        className="text-[10px] hover:text-brand-error transition-colors cursor-pointer"
                        title="Resolve / Delete comment"
                      >
                        Resolve
                      </button>
                    </div>
                  </div>
                  {/* Text */}
                  <p className="text-brand-text2 font-mono text-[11px] leading-normal whitespace-pre-wrap">{c.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
