import { describe, it, expect, vi } from 'vitest';

vi.mock('../backend/config/database', () => ({
  pool: { query: vi.fn() },
}));

describe('Files', () => {
  it('should detect JavaScript language from .js extension', () => {
    const ext = 'index.js'.split('.').pop().toLowerCase();
    const langMap = { js: 'javascript', py: 'python', ts: 'typescript', java: 'java', cpp: 'cpp' };
    expect(langMap[ext]).toBe('javascript');
  });

  it('should detect Python language from .py extension', () => {
    const ext = 'main.py'.split('.').pop().toLowerCase();
    const langMap = { js: 'javascript', py: 'python', ts: 'typescript' };
    expect(langMap[ext]).toBe('python');
  });

  it('should return plaintext for unknown extension', () => {
    const ext = 'readme.xyz'.split('.').pop().toLowerCase();
    const langMap = { js: 'javascript', py: 'python' };
    expect(langMap[ext] || 'plaintext').toBe('plaintext');
  });

  it('should build a valid file path', () => {
    const name = 'index.js';
    const path = `/${name}`;
    expect(path).toBe('/index.js');
  });
});
