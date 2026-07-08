'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function FileTree({ files, activeFileId, projectId, onOpenFile, onFilesChange, socket }) {
  const [expanded, setExpanded] = useState({});
  const [creating, setCreating] = useState(null); // { parentId, type }
  const [newName, setNewName] = useState('');
  const toast = useToast();

  function buildTree(items, parentId = null) {
    return items
      .filter(f => f.parent_id === parentId)
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  }

  function toggleExpand(id) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      const data = await api.post('/api/files', {
        name: newName,
        path: `/${newName}`,
        projectId,
        type: creating.type,
        parentId: creating.parentId
      });
      onFilesChange(prev => [...prev, data.file]);
      if (socket) socket.emit('file-tree-change', { action: 'create', file: data.file });
      setCreating(null);
      setNewName('');
      if (data.file.type === 'file') onOpenFile(data.file.id);
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(fileId, e) {
    e.stopPropagation();
    if (!confirm('Delete this file?')) return;
    try {
      await api.delete(`/api/files/${fileId}`);
      onFilesChange(prev => prev.filter(f => f.id !== fileId));
      if (socket) socket.emit('file-tree-change', { action: 'delete', file: { id: fileId } });
      toast.success('Deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  function renderItems(parentId = null, depth = 0) {
    const items = buildTree(files, parentId);
    return items.map(item => (
      <div key={item.id}>
        <div
          className={`flex items-center gap-1 px-2 py-1 cursor-pointer text-xs hover:bg-brand-surface2 transition-colors group
            ${activeFileId === item.id ? 'bg-brand-surface2 text-brand-text1' : 'text-brand-text2'}`}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={() => item.type === 'folder' ? toggleExpand(item.id) : onOpenFile(item.id)}
        >
          <span className="shrink-0 w-4 text-center text-brand-text3">
            {item.type === 'folder' ? (expanded[item.id] ? '▾' : '▸') : ''}
          </span>
          <span className="shrink-0 w-4 text-center" style={{ color: item.type === 'folder' ? 'var(--accent)' : 'var(--cyan)' }}>
            {item.type === 'folder' ? '▤' : '◇'}
          </span>
          <span className="truncate flex-1 font-mono">{item.name}</span>
          <button
            onClick={(e) => handleDelete(item.id, e)}
            className="opacity-0 group-hover:opacity-100 text-brand-text3 hover:text-brand-error shrink-0"
          >
            ×
          </button>
        </div>
        {item.type === 'folder' && expanded[item.id] && renderItems(item.id, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-8 px-3 flex items-center justify-between border-b border-brand-border shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-text3">Files</span>
        <div className="flex gap-1">
          <button
            onClick={() => setCreating({ parentId: null, type: 'file' })}
            className="text-xs text-brand-text3 hover:text-brand-text1 px-1"
            title="New file"
          >+◇</button>
          <button
            onClick={() => setCreating({ parentId: null, type: 'folder' })}
            className="text-xs text-brand-text3 hover:text-brand-text1 px-1"
            title="New folder"
          >+▤</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {creating && (
          <form onSubmit={handleCreate} className="px-2 py-1">
            <input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder={creating.type === 'folder' ? 'Folder name' : 'filename.js'}
              autoFocus
              onBlur={() => { setCreating(null); setNewName(''); }}
              className="w-full px-2 py-1 bg-brand-surface2 border border-brand-borderActive text-xs text-brand-text1 font-mono focus:outline-none"
            />
          </form>
        )}
        {files.length === 0 && !creating ? (
          <div className="px-3 py-4 text-xs text-brand-text3 text-center">
            No files yet
          </div>
        ) : (
          renderItems()
        )}
      </div>
    </div>
  );
}
