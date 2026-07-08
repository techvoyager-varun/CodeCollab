'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export default function VersionHistory({ fileId, onRollback }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (!fileId) return;
    setLoading(true);
    api.get(`/api/history/${fileId}`)
      .then(data => setVersions(data.versions))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fileId]);

  async function handleSnapshot() {
    if (!fileId) return;
    try {
      const data = await api.post(`/api/history/${fileId}/snapshot`, { label: `Snapshot ${new Date().toLocaleTimeString()}` });
      setVersions(prev => [data.version, ...prev]);
      toast.success('Snapshot created');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleRollback(versionId) {
    if (!confirm('Rollback to this version? Current state will be saved as a snapshot.')) return;
    try {
      const data = await api.post(`/api/history/${fileId}/rollback/${versionId}`);
      onRollback(data.file.content);
      toast.success('Rolled back');
      
      const updated = await api.get(`/api/history/${fileId}`);
      setVersions(updated.versions);
    } catch (err) {
      toast.error(err.message);
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="h-8 px-3 flex items-center justify-between border-b border-brand-border shrink-0">
        <span className="text-[10px] font-mono uppercase tracking-widest text-brand-text3">History</span>
        <button
          onClick={handleSnapshot}
          disabled={!fileId}
          className="text-[10px] font-mono disabled:opacity-30"
          style={{ color: 'var(--accent)' }}
        >
          + Snapshot
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!fileId ? (
          <p className="text-xs text-brand-text3 text-center py-4">Open a file to see history</p>
        ) : loading ? (
          <div className="p-3 space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="skeleton h-10 w-full" />)}
          </div>
        ) : versions.length === 0 ? (
          <p className="text-xs text-brand-text3 text-center py-4">No snapshots yet</p>
        ) : (
          <div className="divide-y divide-brand-border">
            {versions.map(v => (
              <div key={v.id} className="px-3 py-2 hover:bg-brand-surface1 transition-colors group">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{v.label || 'Snapshot'}</span>
                  <button
                    onClick={() => handleRollback(v.id)}
                    className="text-[10px] font-mono opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--accent)' }}
                  >
                    Restore
                  </button>
                </div>
                <div className="text-[10px] text-brand-text3 mt-0.5 font-mono">
                  {v.creator_name} · {new Date(v.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
