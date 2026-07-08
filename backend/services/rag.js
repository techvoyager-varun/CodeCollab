const { pool } = require('../config/database');
const { askGemini, PROMPTS, getAI } = require('./gemini');
const File = require('../models/File');

// Chunk code into overlapping segments
function chunkText(text, chunkSize = 500, overlap = 50) {
  const chunks = [];
  const lines = text.split('\n');
  let currentChunk = [];
  let currentLength = 0;

  for (const line of lines) {
    currentChunk.push(line);
    currentLength += line.length + 1;

    if (currentLength >= chunkSize) {
      chunks.push(currentChunk.join('\n'));
      // Keep last few lines for overlap
      const overlapLines = Math.max(2, Math.floor(overlap / 20));
      currentChunk = currentChunk.slice(-overlapLines);
      currentLength = currentChunk.join('\n').length;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks;
}

// Generate embedding using Gemini
async function generateEmbedding(text) {
  try {
    const client = getAI();
    const response = await client.models.embedContent({
      model: 'text-embedding-004',
      contents: text
    });
    return response.embedding.values;
  } catch (err) {
    console.error('[RAG] Embedding generation failed:', err.message);
    return null;
  }
}

// Store embedding in pgvector
async function storeEmbedding(fileId, projectId, chunk, embedding) {
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    await pool.query(
      `INSERT INTO embeddings (file_id, project_id, chunk, embedding) 
       VALUES ($1, $2, $3, $4)`,
      [fileId, projectId, chunk, vectorStr]
    );
  } catch (err) {
    console.error('[RAG] Store embedding failed:', err.message);
  }
}

// Index a single file
async function indexFile(fileId, projectId, content, fileName) {
  // Delete old embeddings for this file
  await pool.query('DELETE FROM embeddings WHERE file_id = $1', [fileId]);

  if (!content || content.trim().length === 0) return;

  const chunks = chunkText(content);

  for (const chunk of chunks) {
    const labeledChunk = `// File: ${fileName}\n${chunk}`;
    const embedding = await generateEmbedding(labeledChunk);
    if (embedding) {
      await storeEmbedding(fileId, projectId, labeledChunk, embedding);
    }
  }

  console.log(`[RAG] Indexed ${chunks.length} chunks from ${fileName}`);
}

// Index all files in a project
async function indexProject(projectId) {
  const files = await File.findByProject(projectId);
  let totalChunks = 0;

  for (const file of files) {
    if (file.content && file.content.trim().length > 0) {
      const chunks = chunkText(file.content);
      totalChunks += chunks.length;

      // Delete old embeddings
      await pool.query('DELETE FROM embeddings WHERE file_id = $1', [file.id]);

      for (const chunk of chunks) {
        const labeledChunk = `// File: ${file.name}\n${chunk}`;
        const embedding = await generateEmbedding(labeledChunk);
        if (embedding) {
          await storeEmbedding(file.id, projectId, labeledChunk, embedding);
        }
      }
    }
  }

  console.log(`[RAG] Indexed project: ${files.length} files, ${totalChunks} chunks`);
  return { files: files.length, chunks: totalChunks };
}

// Similarity search
async function searchSimilar(embedding, projectId, topK = 5) {
  try {
    const vectorStr = `[${embedding.join(',')}]`;
    const result = await pool.query(
      `SELECT chunk, file_id, 1 - (embedding <=> $1) as similarity
       FROM embeddings 
       WHERE project_id = $2
       ORDER BY embedding <=> $1 
       LIMIT $3`,
      [vectorStr, projectId, topK]
    );
    return result.rows;
  } catch (err) {
    console.error('[RAG] Similarity search failed:', err.message);
    return [];
  }
}

// Full RAG query: embed question → search → augment prompt → ask Gemini
async function queryWithContext(question, projectId) {
  // Generate embedding for the question
  const questionEmbedding = await generateEmbedding(question);

  let context = '';

  if (questionEmbedding) {
    // Search for similar chunks
    const results = await searchSimilar(questionEmbedding, projectId);

    if (results.length > 0) {
      context = results.map(r => r.chunk).join('\n\n---\n\n');
    }
  }

  // If no embeddings found, try to get some file content directly
  if (!context) {
    const files = await File.findByProject(projectId);
    context = files
      .slice(0, 5)
      .map(f => `// File: ${f.name}\n${f.content.slice(0, 500)}`)
      .join('\n\n---\n\n');
  }

  // Build RAG prompt and ask Gemini
  const prompt = PROMPTS.ragQuery(question, context);
  const answer = await askGemini(prompt);
  return answer;
}

module.exports = { chunkText, generateEmbedding, storeEmbedding, indexFile, indexProject, searchSimilar, queryWithContext };
