const { pool } = require('../config/database');

const Message = {
  async create(roomId, userId, username, content, type = 'text', replyTo = null) {
    const result = await pool.query(
      `INSERT INTO messages (room_id, user_id, username, content, type, reply_to) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [roomId, userId, username, content, type, replyTo]
    );
    return result.rows[0];
  },

  async findByRoom(roomId, limit = 50, offset = 0) {
    const result = await pool.query(
      `SELECT m.*, u.avatar_color
       FROM messages m 
       JOIN users u ON m.user_id = u.id
       WHERE m.room_id = $1 
       ORDER BY m.created_at ASC 
       LIMIT $2 OFFSET $3`,
      [roomId, limit, offset]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM messages WHERE id = $1', [id]);
  }
};

module.exports = Message;
