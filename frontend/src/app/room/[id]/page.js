'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSocket } from '@/contexts/SocketContext';
import { SocketProvider } from '@/contexts/SocketContext';
import { useToast } from '@/contexts/ToastContext';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';
import FileTree from '@/components/editor/FileTree';
import ChatPanel from '@/components/editor/ChatPanel';
import AIPanel from '@/components/editor/AIPanel';
import PresenceBar from '@/components/editor/PresenceBar';
import Terminal from '@/components/editor/Terminal';
import Toolbar from '@/components/editor/Toolbar';
import TabBar from '@/components/editor/TabBar';
import VersionHistory from '@/components/editor/VersionHistory';
import ThemeToggle from '@/components/ui/ThemeToggle';
import VoiceManager from '@/components/editor/VoiceManager';
import ReviewPanel from '@/components/editor/ReviewPanel';
import DSAPanel from '@/components/editor/DSAPanel';


const EditorPanel = dynamic(() => import('@/components/editor/EditorPanel'), { ssr: false });
const Whiteboard = dynamic(() => import('@/components/editor/Whiteboard'), { ssr: false });

function RoomContent() {
  const { id: roomId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const { socket, connected } = useSocket();
  const toast = useToast();
  const router = useRouter();

  const [room, setRoom] = useState(null);
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState(null);
  const [activeFile, setActiveFile] = useState(null);
  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [rightPanel, setRightPanel] = useState('chat'); // chat | ai | history | review
  const [reviewComments, setReviewComments] = useState([]);
  const [editorFocusLine, setEditorFocusLine] = useState(null);
  const [aiPrefilledPrompt, setAiPrefilledPrompt] = useState('');
  const [aiPrefilledMode, setAiPrefilledMode] = useState('');
  const [showTerminal, setShowTerminal] = useState(false);
  const [terminalOutput, setTerminalOutput] = useState(null);
  const [showFileTree, setShowFileTree] = useState(true);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [roomUsers, setRoomUsers] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = useCallback(async (q) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const data = await api.get(`/api/auth/search?q=${q}`);
      setSearchResults(data.users);
    } catch (e) {
      // ignore
    }
  }, []);

  const handleInvite = useCallback(async (userId) => {
    try {
      await api.post(`/api/projects/${room.project_id}/members`, { userId });
      toast.success('Member invited');
      setSearchQuery('');
      setSearchResults([]);
      setShowInviteModal(false);
    } catch (err) {
      toast.error(err.message);
    }
  }, [room, toast]);

  // Fetch room data
  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!user) return;

    async function loadRoom() {
      try {
        const data = await api.get(`/api/rooms/${roomId}`);
        setRoom(data.room);
        const fileData = await api.get(`/api/files/tree/${data.room.project_id}`);
        setFiles(fileData.files);
      } catch (err) {
        toast.error('Failed to load room');
        router.push('/dashboard');
      }
    }
    loadRoom();
  }, [roomId, user, authLoading]);

  // Socket join/leave
  useEffect(() => {
    if (!socket || !connected || !user || !room) return;

    socket.emit('join-room', {
      roomId,
      user: { id: user.id, username: user.username, avatarColor: user.avatar_color }
    });

    socket.on('room-users', (users) => setRoomUsers(users));
    socket.on('user-joined', ({ username }) => toast.info(`${username} joined`));
    socket.on('user-left', ({ username }) => toast.info(`${username} left`));

    socket.on('code-change', ({ fileId, changes }) => {
      if (fileId === activeFileId) {
        // Update will be handled by EditorPanel
      }
    });

    socket.on('cursor-move', ({ userId, username, avatarColor, fileId, position, selection }) => {
      setRemoteCursors(prev => ({ ...prev, [userId]: { username, avatarColor, fileId, position, selection } }));
    });

    socket.on('cursor-remove', ({ userId }) => {
      setRemoteCursors(prev => { const n = { ...prev }; delete n[userId]; return n; });
    });

    socket.on('file-saved', ({ fileId, savedBy }) => {
      toast.info(`${savedBy} saved a file`);
    });

    socket.on('file-tree-change', () => {
      if (room) {
        api.get(`/api/files/tree/${room.project_id}`).then(d => setFiles(d.files));
      }
    });

    socket.on('execute-output', (payload) => {
      setTerminalOutput(prev => {
        if (payload.type === 'stdout') {
          return {
            ...prev,
            stdout: (prev?.stdout || '') + payload.data
          };
        } else if (payload.type === 'stderr') {
          return {
            ...prev,
            stderr: (prev?.stderr || '') + payload.data
          };
        } else if (payload.type === 'exit') {
          return {
            ...prev,
            running: false,
            exitCode: payload.exitCode,
            executionTime: payload.executionTime,
            memoryUsage: payload.memoryUsage
          };
        }
        return prev;
      });
    });

    return () => {
      socket.emit('leave-room');
      socket.off('room-users');
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('code-change');
      socket.off('cursor-move');
      socket.off('cursor-remove');
      socket.off('file-saved');
      socket.off('file-tree-change');
      socket.off('execute-output');
    };
  }, [socket, connected, user, room, roomId]);

  // Open a file in editor
  const openFile = useCallback(async (fileId) => {
    try {
      const data = await api.get(`/api/files/${fileId}/content`);
      const file = data.file;
      setActiveFileId(fileId);
      setActiveFile(file);
      setShowWhiteboard(false);
      if (!openFiles.find(f => f.id === fileId)) {
        setOpenFiles(prev => [...prev, { id: file.id, name: file.name, language: file.language }]);
      }
    } catch (err) {
      toast.error('Failed to open file');
    }
  }, [openFiles]);

  const closeFile = useCallback((fileId) => {
    setOpenFiles(prev => {
      const remaining = prev.filter(f => f.id !== fileId);
      if (activeFileId === fileId) {
        if (remaining.length > 0) {
          openFile(remaining[remaining.length - 1].id);
        } else {
          setActiveFileId(null);
          setActiveFile(null);
          setShowWhiteboard(true);
        }
      }
      return remaining;
    });
  }, [activeFileId, openFile]);

  const handleSave = useCallback(async (content) => {
    if (!activeFileId) return;
    try {
      await api.put(`/api/files/${activeFileId}`, { content });
      if (socket) socket.emit('file-save', { fileId: activeFileId, content });
      toast.success('Saved');
    } catch (err) {
      toast.error('Save failed');
    }
  }, [activeFileId, socket]);

  const handleRunCode = useCallback((stdin = '') => {
    if (!activeFile || !socket) return;
    const stdinStr = typeof stdin === 'string' ? stdin : '';
    setShowTerminal(true);
    setTerminalOutput({ stdout: '', stderr: '', running: true });
    socket.emit('execute-start', { code: activeFile.content, language: activeFile.language });
    if (stdinStr) {
      socket.emit('execute-stdin', { text: stdinStr });
    }
  }, [activeFile, socket]);

  const handleSendStdin = useCallback((text) => {
    if (!socket) return;
    setTerminalOutput(prev => ({
      ...prev,
      stdout: (prev?.stdout || '') + text + '\n'
    }));
    socket.emit('execute-stdin', { text });
  }, [socket]);

  const handleClearTerminal = useCallback(() => {
    setTerminalOutput(null);
  }, []);

  const handleKillTerminal = useCallback(() => {
    if (socket) {
      socket.emit('execute-kill');
    }
    setTerminalOutput(prev => prev ? { ...prev, running: false } : null);
  }, [socket]);

  // Review comments callbacks
  const handleAddComment = useCallback(async (lineNumber, text) => {
    if (!activeFileId) return;
    try {
      const data = await api.post('/api/reviews', {
        fileId: activeFileId,
        lineNumber,
        comment: text
      });
      setReviewComments(prev => {
        if (prev.find(c => c.id === data.review.id)) return prev;
        return [...prev, data.review].sort((a, b) => a.line_number - b.line_number);
      });
      toast.success('Comment added');
    } catch (err) {
      toast.error(err.message);
    }
  }, [activeFileId, toast]);

  const handleDeleteComment = useCallback(async (commentId) => {
    try {
      await api.delete(`/api/reviews/${commentId}`);
      setReviewComments(prev => prev.filter(c => c.id !== commentId));
      toast.success('Comment resolved');
    } catch (err) {
      toast.error(err.message);
    }
  }, [toast]);

  const handleEditorCommentClick = useCallback((lineNumber) => {
    setRightPanel('review');
    setShowRightPanel(true);
  }, []);

  const handleDiagnoseError = useCallback((stderr) => {
    setAiPrefilledPrompt(stderr);
    setAiPrefilledMode('debug');
    setRightPanel('ai');
    setShowRightPanel(true);
  }, []);

  // Fetch comments on file change
  useEffect(() => {
    if (!activeFileId) {
      setReviewComments([]);
      return;
    }
    async function fetchComments() {
      try {
        const data = await api.get(`/api/reviews/${activeFileId}`);
        setReviewComments(data.reviews);
      } catch (err) {
        console.error('Failed to fetch review comments', err);
      }
    }
    fetchComments();
  }, [activeFileId]);

  // Sync comments in real-time
  useEffect(() => {
    if (!socket || !activeFileId) return;

    const handleCommentAdd = (newComment) => {
      setReviewComments(prev => {
        if (prev.find(c => c.id === newComment.id)) return prev;
        return [...prev, newComment].sort((a, b) => a.line_number - b.line_number);
      });
    };

    const handleCommentDelete = ({ id }) => {
      setReviewComments(prev => prev.filter(c => c.id !== id));
    };

    socket.on(`file-comment-add:${activeFileId}`, handleCommentAdd);
    socket.on(`file-comment-delete`, handleCommentDelete);

    return () => {
      socket.off(`file-comment-add:${activeFileId}`, handleCommentAdd);
      socket.off(`file-comment-delete`, handleCommentDelete);
    };
  }, [socket, activeFileId]);

  if (authLoading || !user || !room) {
    return <main className="flex-1 flex items-center justify-center"><div className="text-sm text-brand-text2">Loading workspace...</div></main>;
  }

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden">
      {/* Top bar */}
      <header className="h-10 border-b border-brand-border flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-xs text-brand-text2 hover:text-brand-text1">← Back</button>
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{room.project_name}</span>
          <span className="text-xs text-brand-text3 font-mono">/ {room.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <PresenceBar users={roomUsers} />
          <button
            onClick={() => setShowInviteModal(true)}
            className="text-[10px] font-mono border border-brand-border px-1.5 py-0.5 hover:border-brand-borderActive text-brand-text2 hover:text-brand-text1 transition-colors"
          >
            + Invite
          </button>
          <div className="w-px h-4 bg-brand-border mx-1" />
          <span className={`w-1.5 h-1.5 ${connected ? 'bg-brand-success' : 'bg-brand-error'}`} title={connected ? 'Connected' : 'Disconnected'} />
          <ThemeToggle />
        </div>
      </header>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-brand-surface1 border border-brand-border p-6 w-full max-w-md animate-fade" style={{ backgroundColor: 'var(--surface-1)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-sm font-bold mb-4 font-sans">Invite Teammate</h2>

            {/* Invite Link */}
            <div className="mb-4">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text3 mb-1.5 block">Invite Link</label>
              <div className="flex gap-1">
                <input
                  readOnly
                  value={typeof window !== 'undefined' ? `${window.location.origin}/room/${roomId}` : ''}
                  className="flex-1 px-2 py-1.5 bg-brand-base border border-brand-border text-xs text-brand-text1 font-mono focus:outline-none"
                  style={{ backgroundColor: 'var(--base)' }}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/room/${roomId}`);
                    toast.success('Link copied!');
                  }}
                  className="px-3 py-1.5 text-xs font-medium shrink-0"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
                >
                  Copy
                </button>
              </div>
              <p className="text-[10px] text-brand-text3 mt-1">Share this link with teammates to invite them.</p>
            </div>

            {/* Search users */}
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-mono uppercase tracking-widest text-brand-text3">Or search by username</label>
              <input
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search username or email..."
                className="px-3 py-2 bg-brand-base border border-brand-border text-xs text-brand-text1 placeholder:text-brand-text3 focus:outline-none"
                style={{ backgroundColor: 'var(--base)' }}
              />
              <div className="max-h-48 overflow-y-auto flex flex-col divide-y divide-brand-border border border-brand-border bg-brand-base" style={{ backgroundColor: 'var(--base)' }}>
                {searchResults.length === 0 ? (
                  <p className="p-3 text-[11px] text-brand-text3 text-center">No users found</p>
                ) : (
                  searchResults.map(u => (
                    <div key={u.id} className="p-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className="w-5 h-5 shrink-0 flex items-center justify-center text-[9px] font-bold text-brand-base"
                          style={{ backgroundColor: u.avatar_color || 'var(--accent)' }}
                        >
                          {u.username[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate text-brand-text1">{u.username}</p>
                          <p className="text-[10px] text-brand-text3 truncate">{u.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleInvite(u.id)}
                        className="px-2 py-1 text-[10px] font-mono shrink-0 transition-colors"
                        style={{ backgroundColor: 'var(--accent)', color: 'var(--base)' }}
                      >
                        + Add
                      </button>
                    </div>
                  ))
                )}
              </div>
              <button
                onClick={() => { setShowInviteModal(false); setSearchQuery(''); setSearchResults([]); }}
                className="w-full py-2 text-xs border border-brand-border text-brand-text2 hover:text-brand-text1 font-mono mt-1"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Toolbar
        onRun={handleRunCode}
        onSave={() => activeFile && handleSave(activeFile.content)}
        onToggleFileTree={() => setShowFileTree(v => !v)}
        onToggleTerminal={() => setShowTerminal(v => !v)}
        rightPanel={rightPanel}
        onSetRightPanel={setRightPanel}
        onToggleRightPanel={() => setShowRightPanel(v => !v)}
        activeFile={activeFile}
        showWhiteboard={showWhiteboard}
        onSelectWhiteboard={() => {
          setShowWhiteboard(true);
          setActiveFileId(null);
          setActiveFile(null);
        }}
      />

      {/* Main workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* File tree */}
        {showFileTree && (
          <div className="w-56 border-r border-brand-border flex flex-col shrink-0 overflow-hidden" style={{ backgroundColor: 'var(--surface-1)' }}>
            <FileTree
              files={files}
              activeFileId={activeFileId}
              projectId={room.project_id}
              onOpenFile={openFile}
              onFilesChange={setFiles}
              socket={socket}
            />
            <VoiceManager
              socket={socket}
              roomId={roomId}
              currentUser={user}
            />
          </div>
        )}

        {/* Editor area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <TabBar
            files={openFiles}
            activeFileId={activeFileId}
            onSelect={(id) => openFile(id)}
            onClose={closeFile}
            showWhiteboard={showWhiteboard}
            onSelectWhiteboard={() => {
              setShowWhiteboard(true);
              setActiveFileId(null);
              setActiveFile(null);
            }}
          />
          <div className="flex-1 min-h-0 overflow-hidden relative">
            <div className="absolute inset-0">
              {showWhiteboard ? (
                <Whiteboard socket={socket} roomId={roomId} />
              ) : activeFile ? (
                <EditorPanel
                  file={activeFile}
                  onSave={handleSave}
                  onChange={(content) => setActiveFile(prev => ({ ...prev, content }))}
                  socket={socket}
                  roomId={roomId}
                  remoteCursors={remoteCursors}
                  comments={reviewComments}
                  onAddCommentClick={handleEditorCommentClick}
                  focusLine={editorFocusLine}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-brand-text3 text-sm">
                  <div className="text-center">
                    <p className="text-lg mb-2" style={{ color: 'var(--accent)' }}>⌨</p>
                    <p>Open a file or select Whiteboard to start collaborating</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          {showTerminal && (
            <Terminal
              output={terminalOutput}
              onClose={() => setShowTerminal(false)}
              onRunWithInput={handleRunCode}
              onSendStdin={handleSendStdin}
              onClear={handleClearTerminal}
              onKill={handleKillTerminal}
              socket={socket}
              onDiagnoseError={handleDiagnoseError}
            />
          )}
        </div>

        {/* Right panel */}
        {showRightPanel && (
          <div className="w-72 border-l border-brand-border shrink-0" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              {rightPanel === 'chat' && <ChatPanel roomId={roomId} socket={socket} user={user} />}
              {rightPanel === 'ai' && (
                <AIPanel
                  projectId={room.project_id}
                  activeFile={activeFile}
                  prefilledPrompt={aiPrefilledPrompt}
                  prefilledMode={aiPrefilledMode}
                />
              )}
              {rightPanel === 'history' && <VersionHistory fileId={activeFileId} onRollback={(content) => { setActiveFile(prev => ({ ...prev, content })); }} />}
              {rightPanel === 'review' && (
                <ReviewPanel
                  comments={reviewComments}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                  activeFile={activeFile}
                  onSelectLine={(lineNumber) => setEditorFocusLine({ lineNumber, timestamp: Date.now() })}
                />
              )}
              {rightPanel === 'dsa' && (
                <DSAPanel
                  activeFile={activeFile}
                  terminalOutput={terminalOutput}
                  onRunCode={handleRunCode}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function RoomPage() {
  return (
    <SocketProvider>
      <RoomContent />
    </SocketProvider>
  );
}
