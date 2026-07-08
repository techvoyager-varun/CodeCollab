const { pool } = require('../config/database');

const File = {
  async create(name, path, projectId, type = 'file', parentId = null, language = 'plaintext', content = '') {
    const result = await pool.query(
      `INSERT INTO files (name, path, content, type, parent_id, project_id, language) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name, path, content, type, parentId, projectId, language]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM files WHERE id = $1', [id]);
    return result.rows[0];
  },

  async getContent(id) {
    const result = await pool.query(
      'SELECT id, name, path, content, language, updated_at FROM files WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async getTree(projectId) {
    const result = await pool.query(
      `SELECT id, name, path, type, parent_id, language, updated_at 
       FROM files WHERE project_id = $1 
       ORDER BY type DESC, name ASC`,
      [projectId]
    );
    return result.rows;
  },

  async updateContent(id, content) {
    const result = await pool.query(
      `UPDATE files SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [content, id]
    );
    return result.rows[0];
  },

  async rename(id, newName, newPath) {
    const result = await pool.query(
      `UPDATE files SET name = $1, path = $2, updated_at = NOW() WHERE id = $3 RETURNING *`,
      [newName, newPath, id]
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM files WHERE id = $1', [id]);
  },

  async findByProject(projectId) {
    const result = await pool.query(
      'SELECT id, name, path, content, language FROM files WHERE project_id = $1 AND type = $2',
      [projectId, 'file']
    );
    return result.rows;
  },

  async detectLanguage(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const langMap = {
      js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
      py: 'python', java: 'java', cpp: 'cpp', c: 'c', cs: 'csharp',
      go: 'go', rs: 'rust', rb: 'ruby', php: 'php', swift: 'swift',
      kt: 'kotlin', html: 'html', css: 'css', scss: 'scss',
      json: 'json', md: 'markdown', yml: 'yaml', yaml: 'yaml',
      sql: 'sql', sh: 'shell', bash: 'shell', xml: 'xml',
      txt: 'plaintext'
    };
    return langMap[ext] || 'plaintext';
  }
};

module.exports = File;
