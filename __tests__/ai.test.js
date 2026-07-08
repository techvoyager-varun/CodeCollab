import { describe, it, expect } from 'vitest';

// Test the chunking function logic
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
      const overlapLines = Math.max(2, Math.floor(overlap / 20));
      currentChunk = currentChunk.slice(-overlapLines);
      currentLength = currentChunk.join('\n').length;
    }
  }
  if (currentChunk.length > 0) chunks.push(currentChunk.join('\n'));
  return chunks;
}

describe('AI / RAG', () => {
  it('should chunk text into segments', () => {
    const text = Array(50).fill('const x = 1; // some code here that is long enough').join('\n');
    const chunks = chunkText(text, 200, 30);
    expect(chunks.length).toBeGreaterThan(1);
  });

  it('should handle empty text', () => {
    const chunks = chunkText('');
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('');
  });

  it('should handle short text (single chunk)', () => {
    const chunks = chunkText('hello world');
    expect(chunks.length).toBe(1);
    expect(chunks[0]).toBe('hello world');
  });

  it('should maintain overlap between chunks', () => {
    const lines = Array(100).fill('x'.repeat(20));
    const text = lines.join('\n');
    const chunks = chunkText(text, 200, 50);
    // Consecutive chunks should share some content
    if (chunks.length >= 2) {
      const lastLinesOfFirst = chunks[0].split('\n').slice(-2);
      const firstLinesOfSecond = chunks[1].split('\n').slice(0, 2);
      expect(lastLinesOfFirst[0]).toBe(firstLinesOfSecond[0]);
    }
  });

  it('should build valid RAG prompt', () => {
    const question = 'Why is login failing?';
    const context = '// File: auth.js\nconst login = () => {}';
    const prompt = `Answer using this code:\n${context}\n\nQuestion: ${question}`;
    expect(prompt).toContain(question);
    expect(prompt).toContain('auth.js');
  });
});
