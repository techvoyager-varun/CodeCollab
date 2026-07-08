const { pool } = require('../config/database');

const Version = {
  async create(fileId, content, createdBy, label = null) {
    const result = await pool.query(
      `INSERT INTO versions (file_id, content, created_by, label) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [fileId, content, createdBy, label]
    );
    return result.rows[0];
  },

  async findByFile(fileId) {
    const result = await pool.query(
      `SELECT v.*, u.username as creator_name
       FROM versions v 
       JOIN users u ON v.created_by = u.id
       WHERE v.file_id = $1 
       ORDER BY v.created_at DESC`,
      [fileId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM versions WHERE id = $1', [id]);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM versions WHERE id = $1', [id]);
  }
};

module.exports = Version;
