'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function DashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newLang, setNewLang] = useState('javascript');
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) fetchProjects();
  }, [user]);

  async function fetchProjects() {
    try {
      const data = await api.get('/api/projects');
      setProjects(data.projects);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      const data = await api.post('/api/projects', { name: newName, description: newDesc, language: newLang });
      
      await api.post('/api/rooms', { projectId: data.project.id, name: 'Main' });
      setProjects(prev => [data.project, ...prev]);
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
      toast.success('Project created');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api.delete(`/api/projects/${id}`);
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success('Project deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function openProject(project) {
    try {
      const data = await api.get(`/api/rooms/project/${project.id}`);
      if (data.rooms.length > 0) {
        router.push(`/room/${data.rooms[0].id}`);
      } else {
        const roomData = await api.post('/api/rooms', { projectId: project.id, name: 'Main' });
        router.push(`/room/${roomData.room.id}`);
      }
    } catch (err) {
      toast.error('Failed to open project');
    }
  }

  if (authLoading || !user) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-sm text-brand-text2">Loading...</div>
      </main>
    );
  }

  return (
    <main className="flex-1">
      {}
      <header className="sticky top-0 z-50 border-b border-brand-border" style={{ backgroundColor: 'var(--base)' }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 select-none hover:opacity-90 transition-opacity">
            <img src="/logo.png" alt="Logo" className="h-10 w-auto object-contain" />
            <span className="text-base font-bold tracking-wide" style={{ color: 'var(--accent)' }}>
              CodeCollab
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <span className="text-xs text-brand-text2 font-mono">{user.username}</span>
            <button
              onClick={logout}
              className="text-xs text-brand-text3 hover:text-brand-error transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      {}
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Projects</h1>
            <p className="text-sm text-brand-text2 mt-1">Your workspaces and collaborations.</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
          >
            + New project
          </button>
        </div>

        {}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreate(false)}>
            <div className="border border-brand-border p-6 w-full max-w-md animate-fade" style={{ backgroundColor: 'var(--surface-1)' }} onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">New project</h2>
              <form onSubmit={handleCreate} className="flex flex-col gap-3">
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Project name"
                  required
                  className="px-3 py-2 border border-brand-border text-sm text-brand-text1 placeholder:text-brand-text3 focus:outline-none"
                  style={{ backgroundColor: 'var(--base)' }}
                />
                <textarea
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  rows={2}
                  className="px-3 py-2 border border-brand-border text-sm text-brand-text1 placeholder:text-brand-text3 focus:outline-none resize-none"
                  style={{ backgroundColor: 'var(--base)' }}
                />
                <select
                  value={newLang}
                  onChange={e => setNewLang(e.target.value)}
                  className="px-3 py-2 border border-brand-border text-sm text-brand-text1 focus:outline-none"
                  style={{ backgroundColor: 'var(--base)' }}
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="typescript">TypeScript</option>
                  <option value="java">Java</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                  <option value="ruby">Ruby</option>
                </select>
                <div className="flex gap-2 mt-2">
                  <button type="submit" className="flex-1 py-2 text-sm font-medium" style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}>
                    Create
                  </button>
                  <button type="button" onClick={() => setShowCreate(false)} className="flex-1 py-2 text-sm border border-brand-border text-brand-text2 hover:text-brand-text1">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-brand-border border border-brand-border">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-brand-base p-6">
                <div className="skeleton h-5 w-32 mb-2" />
                <div className="skeleton h-3 w-48 mb-4" />
                <div className="skeleton h-3 w-20" />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="border border-brand-border p-12 text-center">
            <p className="text-brand-text2 text-sm mb-4">No projects yet.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="text-sm font-medium"
              style={{ color: 'var(--accent)' }}
            >
              Create your first project →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-brand-border border border-brand-border">
            {projects.map(project => (
              <div
                key={project.id}
                className="bg-brand-base p-6 hover:bg-brand-surface1 transition-colors cursor-pointer group"
                onClick={() => openProject(project)}
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold group-hover:text-brand-accent transition-colors" style={{ color: 'var(--text-1)' }}>
                    {project.name}
                  </h3>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                    className="text-xs text-brand-text3 hover:text-brand-error transition-colors opacity-0 group-hover:opacity-100"
                  >
                    ×
                  </button>
                </div>
                {project.description && (
                  <p className="text-xs text-brand-text2 mb-3 line-clamp-2">{project.description}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-brand-text3 font-mono">
                  <span>{project.language}</span>
                  <span>·</span>
                  <span>{project.file_count || 0} files</span>
                  <span>·</span>
                  <span>{project.member_count || 1} members</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
