const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function connectDB() {
  try {
    const client = await pool.connect();
    console.log('[DB] PostgreSQL connected');
    client.release();
  } catch (err) {
    console.error('[DB] PostgreSQL connection failed:', err.message);
    throw err;
  }
}

async function initTables() {
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    
    
    try {
      await pool.query('CREATE EXTENSION IF NOT EXISTS "vector"');
      console.log('[DB] pgvector extension enabled');
    } catch (e) {
      console.warn('[DB] pgvector not available — AI embeddings will be disabled');
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'developer',
        avatar_color VARCHAR(7) DEFAULT '#d4a843',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        owner_id UUID REFERENCES users(id) ON DELETE CASCADE,
        language VARCHAR(30) DEFAULT 'javascript',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS project_members (
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) DEFAULT 'editor',
        joined_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (project_id, user_id)
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        path TEXT NOT NULL,
        content TEXT DEFAULT '',
        type VARCHAR(10) DEFAULT 'file',
        parent_id UUID REFERENCES files(id) ON DELETE CASCADE,
        project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
        language VARCHAR(30) DEFAULT 'plaintext',
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS versions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID REFERENCES files(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_by UUID REFERENCES users(id),
        label VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id),
        username VARCHAR(50),
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        reply_to UUID REFERENCES messages(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS review_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_id UUID REFERENCES files(id) ON DELETE CASCADE,
        line_number INT NOT NULL,
        comment TEXT NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        username VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS embeddings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          file_id UUID REFERENCES files(id) ON DELETE CASCADE,
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          chunk TEXT NOT NULL,
          embedding vector(768),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      await pool.query(`
        CREATE INDEX IF NOT EXISTS embeddings_hnsw_idx 
        ON embeddings USING hnsw (embedding vector_cosine_ops)
      `);
    } catch (e) {
      
    }

    console.log('[DB] Tables initialized');
  } catch (err) {
    console.error('[DB] Table initialization failed:', err.message);
    throw err;
  }
}

module.exports = { pool, connectDB, initTables };
