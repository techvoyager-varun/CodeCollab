const Message = require('../models/Message');
const File = require('../models/File');
const Version = require('../models/Version');
const Room = require('../models/Room');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, execSync } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const { LANGUAGE_CONFIG } = require('../services/executor');
const pidusage = require('pidusage');


const activeProcesses = new Map();


const activeShells = new Map();


const roomUsers = new Map();


const roomWhiteboards = new Map();


const roomVoiceUsers = new Map();

function handleLeaveVoice(socket) {
  for (const [roomId, voiceUsers] of roomVoiceUsers.entries()) {
    if (voiceUsers.has(socket.id)) {
      voiceUsers.delete(socket.id);
      socket.to(roomId).emit('webrtc-peer-left', {
        socketId: socket.id
      });
      if (voiceUsers.size === 0) {
        roomVoiceUsers.delete(roomId);
      }
      break;
    }
  }
}

function killActiveShell(socketId) {
  const proc = activeShells.get(socketId);
  if (proc) {
    try {
      proc.kill('SIGKILL');
    } catch (e) {}
    activeShells.delete(socketId);
  }
}

function getProjectWorkspaceDir(roomId) {
  return path.join(os.tmpdir(), 'codecollab_projects', roomId);
}

function setupSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`[SOCKET] Connected: ${socket.id}`);

    let currentRoom = null;
    let currentUser = null;

    
    socket.on('join-room', async ({ roomId, user }) => {
      currentRoom = roomId;
      currentUser = user;

      socket.join(roomId);

      
      try {
        const room = await Room.findById(roomId);
        if (room) {
          const workspaceDir = getProjectWorkspaceDir(roomId);
          socket.workspaceDir = workspaceDir;
          
          fs.mkdirSync(workspaceDir, { recursive: true });
          const files = await File.findByProject(room.project_id);
          for (const file of files) {
            const filePath = path.join(workspaceDir, file.path);
            fs.mkdirSync(path.dirname(filePath), { recursive: true });
            fs.writeFileSync(filePath, file.content || '', 'utf8');
          }
        }
      } catch (err) {
        console.error('[SOCKET] Workspace sync error:', err.message);
      }

      if (user) {
        
        if (!roomUsers.has(roomId)) {
          roomUsers.set(roomId, new Map());
        }
        roomUsers.get(roomId).set(socket.id, {
          id: user.id,
          username: user.username,
          avatarColor: user.avatarColor || '#d4a843',
          socketId: socket.id
        });

        
        const users = Array.from(roomUsers.get(roomId).values());
        io.to(roomId).emit('room-users', users);

        
        socket.to(roomId).emit('user-joined', {
          username: user.username,
          avatarColor: user.avatarColor
        });

        console.log(`[SOCKET] ${user.username} joined room ${roomId}`);
      }
    });

    
    socket.on('leave-room', () => {
      if (currentRoom && currentUser) {
        handleLeaveRoom(socket, io);
      }
    });

    
    socket.on('code-change', ({ fileId, changes, version }) => {
      if (currentRoom) {
        socket.to(currentRoom).emit('code-change', {
          fileId,
          changes,
          version,
          userId: currentUser?.id
        });
      }
    });

    
    socket.on('cursor-move', ({ fileId, position, selection }) => {
      if (currentRoom && currentUser) {
        socket.to(currentRoom).emit('cursor-move', {
          userId: currentUser.id,
          username: currentUser.username,
          avatarColor: currentUser.avatarColor,
          fileId,
          position,
          selection
        });
      }
    });

    
    socket.on('file-save', async ({ fileId, content }) => {
      if (currentRoom) {
        try {
          await File.updateContent(fileId, content);
          
          if (socket.workspaceDir) {
            const file = await File.findById(fileId);
            if (file) {
              const filePath = path.join(socket.workspaceDir, file.path);
              fs.mkdirSync(path.dirname(filePath), { recursive: true });
              fs.writeFileSync(filePath, content || '', 'utf8');
            }
          }

          socket.to(currentRoom).emit('file-saved', {
            fileId,
            savedBy: currentUser?.username
          });
        } catch (err) {
          console.error('[SOCKET] File save error:', err.message);
        }
      }
    });

    
    socket.on('chat-message', async ({ roomId, content, type, replyTo }) => {
      if (currentUser) {
        try {
          const message = await Message.create(
            roomId,
            currentUser.id,
            currentUser.username,
            content,
            type || 'text',
            replyTo
          );
          io.to(roomId).emit('chat-message', {
            ...message,
            avatar_color: currentUser.avatarColor
          });
        } catch (err) {
          console.error('[SOCKET] Chat error:', err.message);
        }
      }
    });

    
    socket.on('typing-start', () => {
      if (currentRoom && currentUser) {
        socket.to(currentRoom).emit('typing-start', {
          userId: currentUser.id,
          username: currentUser.username
        });
      }
    });

    socket.on('typing-stop', () => {
      if (currentRoom && currentUser) {
        socket.to(currentRoom).emit('typing-stop', {
          userId: currentUser.id,
          username: currentUser.username
        });
      }
    });

    
    socket.on('file-tree-change', async ({ action, file }) => {
      if (socket.workspaceDir && file) {
        try {
          const filePath = path.join(socket.workspaceDir, file.path);
          if (action === 'create') {
            if (file.type === 'folder') {
              fs.mkdirSync(filePath, { recursive: true });
            } else {
              fs.mkdirSync(path.dirname(filePath), { recursive: true });
              fs.writeFileSync(filePath, file.content || '', 'utf8');
            }
          } else if (action === 'delete') {
            if (fs.existsSync(filePath)) {
              fs.rmSync(filePath, { recursive: true, force: true });
            }
          }
        } catch (e) {
          console.error('[SOCKET] file-tree-change sync error:', e.message);
        }
      }
      if (currentRoom) {
        socket.to(currentRoom).emit('file-tree-change', { action, file });
      }
    });

    
    socket.on('execute-start', async ({ code, language }) => {
      killActiveProcess(socket.id);

      const config = LANGUAGE_CONFIG[language];
      if (!config) {
        socket.emit('execute-output', { type: 'stderr', data: `Language '${language}' is not supported for execution.` });
        socket.emit('execute-output', { type: 'exit', exitCode: 1, executionTime: 0 });
        return;
      }

      const tmpDir = os.tmpdir();
      const fileId = uuidv4();
      const filePath = path.join(tmpDir, `codecollab_${fileId}${config.ext}`);
      const outPath = path.join(tmpDir, `codecollab_${fileId}${os.platform() === 'win32' ? '.exe' : '.out'}`);

      try {
        fs.writeFileSync(filePath, code, 'utf8');

        
        if (config.buildCmd) {
          socket.emit('execute-output', { type: 'stdout', data: 'Compiling code...\r\n' });
          try {
            execSync(config.buildCmd(filePath, outPath), { timeout: 10000 });
          } catch (buildErr) {
            try { fs.unlinkSync(filePath); } catch (e) {}
            try { fs.unlinkSync(outPath); } catch (e) {}
            const errStr = buildErr.stderr ? buildErr.stderr.toString() : buildErr.message;
            socket.emit('execute-output', { type: 'stderr', data: errStr });
            socket.emit('execute-output', { type: 'exit', exitCode: 1, executionTime: 0 });
            return;
          }
        }

        const spawnConfig = config.getSpawn(filePath, outPath);

        const startTime = Date.now();

        const child = spawn(spawnConfig.cmd, spawnConfig.args, {
          env: { ...process.env, NODE_OPTIONS: '--max-old-space-size=128' }
        });

        let peakMemory = 0;
        const memInterval = setInterval(async () => {
          if (child.pid) {
            try {
              const stats = await pidusage(child.pid);
              if (stats.memory > peakMemory) {
                peakMemory = stats.memory;
              }
            } catch (e) {}
          }
        }, 100);

        
        activeProcesses.set(socket.id, {
          child,
          filePath,
          outPath,
          timer: setTimeout(() => {
            killActiveProcess(socket.id);
            socket.emit('execute-output', { type: 'stderr', data: '\r\nExecution timed out (2m idle limit).\r\n' });
          }, 120000)
        });

        child.stdout.on('data', (data) => {
          socket.emit('execute-output', { type: 'stdout', data: data.toString() });
        });

        child.stderr.on('data', (data) => {
          socket.emit('execute-output', { type: 'stderr', data: data.toString() });
        });

        child.on('close', (exitCode) => {
          clearInterval(memInterval);
          try { pidusage.clear(); } catch (e) {}
          const proc = activeProcesses.get(socket.id);
          if (proc) {
            clearTimeout(proc.timer);
            activeProcesses.delete(socket.id);
          }

          const executionTime = Date.now() - startTime;
          try { fs.unlinkSync(filePath); } catch (e) {}
          try { fs.unlinkSync(outPath); } catch (e) {}

          socket.emit('execute-output', {
            type: 'exit',
            exitCode: exitCode || 0,
            executionTime,
            memoryUsage: peakMemory
          });
        });

        child.on('error', (err) => {
          clearInterval(memInterval);
          try { pidusage.clear(); } catch (e) {}
          const proc = activeProcesses.get(socket.id);
          if (proc) {
            clearTimeout(proc.timer);
            activeProcesses.delete(socket.id);
          }

          try { fs.unlinkSync(filePath); } catch (e) {}
          try { fs.unlinkSync(outPath); } catch (e) {}

          socket.emit('execute-output', { type: 'stderr', data: err.message });
          socket.emit('execute-output', { type: 'exit', exitCode: 1, executionTime: 0, memoryUsage: 0 });
        });

      } catch (err) {
        try { fs.unlinkSync(filePath); } catch (e) {}
        try { fs.unlinkSync(outPath); } catch (e) {}
        socket.emit('execute-output', { type: 'stderr', data: err.message });
        socket.emit('execute-output', { type: 'exit', exitCode: 1, executionTime: 0 });
      }
    });

    socket.on('execute-stdin', ({ text }) => {
      const proc = activeProcesses.get(socket.id);
      if (proc && proc.child && proc.child.stdin && proc.child.stdin.writable) {
        proc.child.stdin.write(text + '\n');

        
        clearTimeout(proc.timer);
        proc.timer = setTimeout(() => {
          killActiveProcess(socket.id);
          socket.emit('execute-output', { type: 'stderr', data: '\r\nExecution timed out (2m idle limit).\r\n' });
        }, 120000);
      }
    });

    socket.on('execute-kill', () => {
      killActiveProcess(socket.id);
    });

    
    socket.on('whiteboard-load', () => {
      if (currentRoom) {
        const shapes = roomWhiteboards.get(currentRoom) || [];
        socket.emit('whiteboard-init', shapes);
      }
    });

    socket.on('whiteboard-draw-add', (shape) => {
      if (currentRoom) {
        if (!roomWhiteboards.has(currentRoom)) {
          roomWhiteboards.set(currentRoom, []);
        }
        roomWhiteboards.get(currentRoom).push(shape);
        socket.to(currentRoom).emit('whiteboard-draw-add', shape);
      }
    });

    socket.on('whiteboard-clear', () => {
      if (currentRoom) {
        roomWhiteboards.set(currentRoom, []);
        socket.to(currentRoom).emit('whiteboard-clear');
      }
    });

    socket.on('whiteboard-draw-raw', (tempShape) => {
      if (currentRoom) {
        socket.to(currentRoom).emit('whiteboard-draw-raw', {
          userId: currentUser?.id,
          username: currentUser?.username,
          avatarColor: currentUser?.avatarColor,
          tempShape
        });
      }
    });

    socket.on('whiteboard-draw-raw-end', () => {
      if (currentRoom) {
        socket.to(currentRoom).emit('whiteboard-draw-raw-end', {
          userId: currentUser?.id
        });
      }
    });

    socket.on('whiteboard-cursor', (pos) => {
      if (currentRoom && currentUser) {
        socket.to(currentRoom).emit('whiteboard-cursor', {
          userId: currentUser.id,
          username: currentUser.username,
          avatarColor: currentUser.avatarColor,
          pos
        });
      }
    });

    
    socket.on('webrtc-join-voice', () => {
      if (currentRoom && currentUser) {
        if (!roomVoiceUsers.has(currentRoom)) {
          roomVoiceUsers.set(currentRoom, new Map());
        }
        
        roomVoiceUsers.get(currentRoom).set(socket.id, {
          socketId: socket.id,
          userId: currentUser.id,
          username: currentUser.username,
          avatarColor: currentUser.avatarColor || '#d4a843'
        });

        const peers = Array.from(roomVoiceUsers.get(currentRoom).values()).filter(p => p.socketId !== socket.id);
        socket.emit('webrtc-voice-peers', peers);

        socket.to(currentRoom).emit('webrtc-peer-joined', {
          socketId: socket.id,
          userId: currentUser.id,
          username: currentUser.username,
          avatarColor: currentUser.avatarColor
        });
      }
    });

    socket.on('webrtc-signal', ({ targetSocketId, signal }) => {
      if (targetSocketId === 'all') {
        if (currentRoom) {
          socket.to(currentRoom).emit('webrtc-signal', {
            senderSocketId: socket.id,
            signal
          });
        }
      } else {
        io.to(targetSocketId).emit('webrtc-signal', {
          senderSocketId: socket.id,
          signal
        });
      }
    });

    socket.on('webrtc-leave-voice', () => {
      handleLeaveVoice(socket);
    });

    
    socket.on('terminal-init', () => {
      if (!socket.workspaceDir) {
        socket.emit('terminal-output', '\r\nWorkspace directory not found. Please re-join the room.\r\n');
        return;
      }
      killActiveShell(socket.id);

      const isWin = os.platform() === 'win32';
      const shell = isWin ? 'powershell.exe' : 'bash';
      const shellArgs = isWin ? ['-NoLogo'] : [];

      const proc = spawn(shell, shellArgs, {
        cwd: socket.workspaceDir,
        env: { ...process.env, TERM: 'xterm-256color' }
      });

      activeShells.set(socket.id, proc);

      proc.stdout.on('data', (data) => {
        socket.emit('terminal-output', data.toString());
      });

      proc.stderr.on('data', (data) => {
        socket.emit('terminal-output', data.toString());
      });

      proc.on('close', (code) => {
        socket.emit('terminal-output', `\r\n[Shell exited with code ${code}]\r\n`);
        activeShells.delete(socket.id);
      });
    });

    socket.on('terminal-input', (text) => {
      const proc = activeShells.get(socket.id);
      if (proc && proc.stdin && proc.stdin.writable) {
        proc.stdin.write(text);
      }
    });

    
    socket.on('disconnect', () => {
      killActiveProcess(socket.id);
      killActiveShell(socket.id);
      handleLeaveRoom(socket, io);
      console.log(`[SOCKET] Disconnected: ${socket.id}`);
    });
  });
}

function handleLeaveRoom(socket, io) {
  killActiveProcess(socket.id);
  killActiveShell(socket.id);
  handleLeaveVoice(socket);

  
  for (const [roomId, users] of roomUsers.entries()) {
    if (users.has(socket.id)) {
      const user = users.get(socket.id);
      users.delete(socket.id);

      if (users.size === 0) {
        roomUsers.delete(roomId);
      }

      
      const remainingUsers = Array.from(users.values());
      io.to(roomId).emit('room-users', remainingUsers);

      
      socket.to(roomId).emit('user-left', {
        username: user.username
      });

      
      socket.to(roomId).emit('cursor-remove', {
        userId: user.id
      });

      socket.leave(roomId);
      break;
    }
  }
}

function killActiveProcess(socketId) {
  const proc = activeProcesses.get(socketId);
  if (proc) {
    clearTimeout(proc.timer);
    try {
      proc.child.kill('SIGKILL');
    } catch (e) {}
    try { fs.unlinkSync(proc.filePath); } catch (e) {}
    try { fs.unlinkSync(proc.outPath); } catch (e) {}
    activeProcesses.delete(socketId);
  }
}

module.exports = { setupSocketHandlers };
