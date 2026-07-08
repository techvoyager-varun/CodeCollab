require('dotenv').config();

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');

const { connectDB, initTables } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { setupSocketHandlers } = require('./socket/handlers');

const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const roomRoutes = require('./routes/rooms');
const fileRoutes = require('./routes/files');
const aiRoutes = require('./routes/ai');
const executeRoutes = require('./routes/execute');
const historyRoutes = require('./routes/history');
const chatRoutes = require('./routes/chat');
const reviewRoutes = require('./routes/reviews');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

let frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
if (typeof frontendUrl === 'string' && frontendUrl.endsWith('/')) {
  frontendUrl = frontendUrl.slice(0, -1);
}

const io = new Server(server, {
  cors: {
    origin: frontendUrl,
    methods: ['GET', 'POST'],
    credentials: true
  }
});


app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin: frontendUrl,
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));


app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/execute', executeRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reviews', reviewRoutes);


setupSocketHandlers(io);


app.set('io', io);


app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});


const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await connectDB();
    await initTables();
    await connectRedis();
    
    server.listen(PORT, () => {
      console.log(`[SERVER] Running on port ${PORT}`);
      console.log(`[SERVER] Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (err) {
    console.error('[SERVER] Failed to start:', err.message);
    process.exit(1);
  }
}

start();
