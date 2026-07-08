const { pool } = require('../config/database');

const User = {
  async create(username, email, hashedPassword) {
    const result = await pool.query(
      `INSERT INTO users (username, email, password) 
       VALUES ($1, $2, $3) 
       RETURNING id, username, email, role, avatar_color, created_at`,
      [username, email, hashedPassword]
    );
    return result.rows[0];
  },

  async findByEmail(email) {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  async findByUsername(username) {
    const result = await pool.query(
      'SELECT * FROM users WHERE username = $1',
      [username]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      'SELECT id, username, email, role, avatar_color, created_at FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  async updateProfile(id, fields) {
    const sets = [];
    const values = [];
    let idx = 1;

    for (const [key, val] of Object.entries(fields)) {
      sets.push(`${key} = $${idx}`);
      values.push(val);
      idx++;
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} 
       RETURNING id, username, email, role, avatar_color, created_at`,
      values
    );
    return result.rows[0];
  },

  async search(query) {
    const result = await pool.query(
      `SELECT id, username, email, avatar_color FROM users 
       WHERE username ILIKE $1 OR email ILIKE $1 LIMIT 10`,
      [`%${query}%`]
    );
    return result.rows;
  }
};

module.exports = User;
