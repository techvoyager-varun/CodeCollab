# CodeCollab: Advanced Collaborative Developer Workspace

CodeCollab is a premium, real-time collaborative development environment (IDE) built for pair programming, interactive debugging, peer-to-peer media sharing, and AI-assisted workflows. It integrates a synchronized Monaco code editor, vector whiteboard sketching, dynamic terminals, WebRTC-based mesh voice chat, and an automated DSA test suite.

<u>[Live Demo](https://github.com/techvoyager-varun/CodeCollab)</u> &nbsp;|&nbsp; <u>[GitHub Repository](https://github.com/techvoyager-varun/CodeCollab)</u>

---

## System Architecture

CodeCollab is structured as a modular, containerized multi-service platform. Traffic is routed dynamically through Nginx to isolated frontend, backend, database, cache, and execution containers.

```mermaid
graph TD
    subgraph Client Space
        ClientA[Client Peer A] <-->|WebRTC Voice & Screen Sharing| ClientB[Client Peer B]
        ClientA <-->|HTTP / WebSockets| Nginx[Nginx Reverse Proxy: Port 80]
        ClientB <-->|HTTP / WebSockets| Nginx
    end

    subgraph Service Layer
        Nginx <-->|Proxy Pass /| Frontend[Next.js App Client: Port 3000]
        Nginx <-->|Proxy Pass /api & /socket.io| Backend[Express.js Engine: Port 5000]
    end

    subgraph Infrastructure & State
        Backend <-->|SQL Queries & pgvector| Postgres[(PostgreSQL DB + pgvector)]
        Backend <-->|Cache & Socket Pub/Sub| Redis[(Redis Broker)]
        Backend -->|Pty / spawn CLI & Profiling| Workspace[Isolated Temp Workspaces]
    end
```

---

## Core Technical Features

### 1. Collaborative Workspace & Editor State
*   **Monaco Editor Sync**: Integrated with Socket.IO for real-time room-based code edits, remote cursor placements, selection overlays, and user-presence tracking.
*   **SVG Collaborative Whiteboard**: Dedicated shared canvas using a vector blueprint pattern. Supports pencil/freehand sketching, line, rectangle, circle, and eraser drawing tools. Syncs raw paths in mid-draw and broadcasts finished vector elements, supporting collaborative cursors.
*   **Presence Mapping**: Visual indicators listing active room users mapped to unique color profiles.

### 2. Multi-Mode Terminal Console
*   **Code Runner Tab**: Compile and execute 17+ languages (Node.js, Python, TypeScript, C, C++, Rust, Go, Java, Swift, etc.) directly on the server. Features dynamic timeout protection (10s compile-time limit) and output log streams.
*   **Interactive CLI Shell Tab**: Spawns fully functional shells (powershell.exe on Windows, bash on POSIX systems) mapped to temporary room workspaces (os.tmpdir()/codecollab_projects/<roomId>). Synchronizes database file edits, creations, and tree movements immediately to the execution filesystem.
*   **Resource Profiling**: Periodically monitors execution CPU and memory usage using pidusage at a 100ms interval, returning peak memory metrics to the console.

### 3. P2P Communication & Media Sharing (WebRTC)
*   **Mesh Voice Chat**: Integrated WebRTC mesh signaling server mapping microphone audio streams directly between room peers. Includes native hardware mute/unmute toggles.
*   **Direct Screen Sharing**: Stream screens directly to other room peers inside the Workspace directory.

### 4. Monaco Code Review Engine
*   **Inline Margin Annotations**: Click line number gutter margins in the Monaco Editor to attach comments directly to specific blocks of code.
*   **Thread Resolution Sidebar**: Collaborative sidebar panel showcasing file-specific commentary. Resolve and delete comments in real-time, backed by PostgreSQL and Socket.IO broadcasts.

### 5. AI Developer Suite (Gemini API)
*   **RAG-Powered Code Search**: Employs PostgreSQL pgvector and vector cosine distance searches (hnsw indices) to locate contextually relevant files, feeding them directly to Gemini 2.5 Flash for project-grounded query answering.
*   **Logical Flowchart Generator**: Analyzes logical execution paths and creates visual architecture flowcharts using Mermaid.js syntax, rendered natively as SVG.
*   **Automated DSA Arena Grading**: Input custom test suites and run code against expected parameters. Submitting a solution sends the codebase to Gemini to evaluate correctness, time complexity, space complexity, edge cases, and style compliance.
*   **Runtime Error Explainer**: If script compilation or execution fails, clicking the "Explain Error" button imports the stack trace into the AI Assistant debugger.
*   **Optimization, Refactoring, & Tests**: Sidebar macros to explain, generate unit tests, optimize, document, or refactor the current file in one click.

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15, Monaco Editor, Tailwind CSS, WebRTC API | SPA, editor core, styling, media streaming |
| **Backend** | Node.js, Express, Socket.IO, pidusage | REST APIs, WebSockets, process metrics |
| **Database** | PostgreSQL (pgvector extension) | Users, projects, files, code reviews, embeddings |
| **Caching** | Redis (Upstash / Redis alpine) | API rate-limiting, pub/sub socket events, caching |
| **AI Model** | Google Gemini 2.5 Flash | RAG search, code review, complexity analysis |
| **Proxy** | Nginx | Reverse proxy, static asset compression, SSL termination |
| **Execution** | isolated subprocesses / Docker | Process execution and sandboxing |

---

## Database Schema (ERD Map)

The database layers are managed inside database.js.

```sql
-- 1. Users Profile
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'developer',
  avatar_color VARCHAR(7) DEFAULT '#d4a843',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 2. Project Workspace
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
  language VARCHAR(30) DEFAULT 'javascript',
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Room Instances
CREATE TABLE rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. File Tree Node
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  path TEXT NOT NULL,
  content TEXT DEFAULT '',
  type VARCHAR(10) DEFAULT 'file',
  parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  language VARCHAR(30) DEFAULT 'plaintext',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Code Review Comments
CREATE TABLE review_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  line_number INT NOT NULL,
  comment TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 6. Vector Embeddings (RAG)
CREATE TABLE embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id UUID REFERENCES files(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  chunk TEXT NOT NULL,
  embedding vector(768),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## WebSockets & WebRTC Protocol Specification

### 1. File Synchronization
*   `join-room` (`{ roomId, user: { id, username, avatarColor } }`): Subscribes to a project workspace room and provisions a local workspace filesystem structure on the server. Returns `whiteboard-init` and `room-users`.
*   `code-change` (`{ fileId, changes, version }`): Broadcasts code edit segments to all peers in the room.
*   `cursor-move` (`{ fileId, position: { lineNumber, column }, selection }`): Relays cursor and selection coordinates to render remote collaborative markers.
*   `file-save` (`{ fileId, content }`): Writes editor text updates back to PostgreSQL and local server filesystems, triggering `file-saved` notification.
*   `file-tree-change` (`{ action, file }`): Broadcaster for node creations, folder updates, or deletions. Syncs directory structures on the execution server.

### 2. Whiteboard Sync
*   `whiteboard-load`: Requests the current whiteboard drawing cache. Returns `whiteboard-init` with vector shape history.
*   `whiteboard-draw-add` (`shape`): Appends finished shapes (pencil, rect, circle, line, eraser) to memory cache and notifies other users.
*   `whiteboard-draw-raw` (`tempShape`): Transmits mouse-drag coordinates in mid-draw to show temporary visual feedback.
*   `whiteboard-cursor` (`pos`): Relays whiteboard coordinate movements to render peer cursors.
*   `whiteboard-clear`: Empties shape cache and triggers board wipe.

### 3. WebRTC Signalling
*   `webrtc-join-voice`: Registers user in room's voice list and signals to other peers to initiate connections.
*   `webrtc-signal` (`{ targetSocketId, signal }`): Proxies WebRTC signal tokens (SDP offers/answers and ICE candidates) between peer mesh points.
*   `webrtc-leave-voice`: Gracefully terminates WebRTC tracks, alerting peers to close RTCPeerConnection sockets.

### 4. Interactive Terminal Shell
*   `terminal-init`: Spawns a shell stream (PowerShell or Bash) cwd-mapped to the project directory.
*   `terminal-input` (`text`): Pipes stdin keystrokes directly into the active interactive shell stream.
*   `terminal-output`: Socket response streaming interactive shell stdout/stderr updates back to the UI.

---

## Environment Configuration

Set up `.env` configurations prior to launching applications.

### 1. Backend Config (`backend/.env`):
```env
# Server Deployment
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000

# Database State
DATABASE_URL=postgresql://codecollab:codecollab_secret@localhost:5432/codecollab

# Redis Broker
REDIS_URL=redis://localhost:6379

# Authorization Secrets
JWT_SECRET=super_secret_jwt_dev_key

# Gemini AI Integration
GEMINI_API_KEY=your_gemini_api_key
```

### 2. Frontend Config (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

---

## Installation & Local Development

### 1. Prerequisites
Install Node.js (v18+), PostgreSQL, and Redis. Install compilers (gcc, g++, rustc) or execution engines (python3, go) to run terminal scripts.

### 2. Project Initialisation
1.  **Clone code repository**:
    ```bash
    git clone https://github.com/techvoyager-varun/CodeCollab.git
    cd CodeCollab
    ```
2.  **Install dependencies**:
    ```bash
    npm run install:all
    ```
3.  **Run Development Engines**:
    ```bash
    npm run dev
    ```
    *   Next.js Client: `http://localhost:3000`
    *   API Backend: `http://localhost:5000`

---

## Docker Deployment & Orchestration

To run CodeCollab in containerized production mode, Nginx is deployed as a reverse proxy, coordinating database, Redis, backend service, and Turbopack app nodes.

1.  **Configure Environment Variables**:
    Ensure the `GEMINI_API_KEY` is exported on your system, or paste it directly in `docker-compose.yml`.
2.  **Build and Start services**:
    ```bash
    docker compose up -d --build
    ```
3.  **Halt environment**:
    ```bash
    docker compose down
    ```
    *   Platform address: `http://localhost`

---

## Testing Coverage

CodeCollab maintains strict testing specs using Vitest for service units and Playwright for browser integration flows.

```bash
# Execute unit testing suite (Vitest)
npm run test

# Execute e2e test cases (Playwright)
npm run test:e2e
```

---

Copyright (c) 2026 Varun. Created and maintained by Varun. All rights reserved.
