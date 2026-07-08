# CodeCollab

Real-time collaborative AI coding platform.

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Monaco Editor, Socket.IO Client
- **Backend**: Express.js, Socket.IO, PostgreSQL, pgvector, Redis
- **AI**: Gemini 2.5 Flash with RAG pipeline
- **Infrastructure**: Docker, Nginx, GitHub Actions CI/CD

## Quick Start (Local Development)

```bash
# Install all dependencies
npm run install:all

# Start both frontend (port 3000) and backend (port 5000)
npm run dev
```

## Docker

```bash
# Start all services (Nginx, Frontend, Backend, PostgreSQL, Redis)
docker compose up --build

# Visit http://localhost
```

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
DATABASE_URL=postgresql://user:pass@localhost:5432/codecollab
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret
GEMINI_API_KEY=your_gemini_key
```

## Deployment (Free)

| Service | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend | Render |
| PostgreSQL + pgvector | Neon |
| Redis | Upstash |
| AI | Gemini API (free tier) |

## Features

- Real-time collaborative editing via Socket.IO
- Monaco Editor with syntax highlighting and autocomplete
- AI Assistant powered by RAG (Retrieval-Augmented Generation)
- JWT authentication with role-based access
- File system with tree structure
- Version history with rollback
- Room-based real-time chat
- Code execution engine
- Docker + Nginx infrastructure
- GitHub Actions CI/CD pipeline

## Testing

```bash
npm run test        # Unit tests (Vitest)
npm run test:e2e    # E2E tests (Playwright)
```

---

© 2026 Varun. All rights reserved. Created by Varun.
