const { pool } = require('../config/database');

const ReviewComment = {
  async create(fileId, lineNumber, comment, userId, username) {
    const result = await pool.query(
      `INSERT INTO review_comments (file_id, line_number, comment, user_id, username) 
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [fileId, lineNumber, comment, userId, username]
    );
    return result.rows[0];
  },

  async findByFile(fileId) {
    const result = await pool.query(
      `SELECT * FROM review_comments WHERE file_id = $1 ORDER BY line_number ASC, created_at ASC`,
      [fileId]
    );
    return result.rows;
  },

  async delete(id) {
    await pool.query('DELETE FROM review_comments WHERE id = $1', [id]);
  }
};

module.exports = ReviewComment;
