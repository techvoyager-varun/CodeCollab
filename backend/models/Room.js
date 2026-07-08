const { pool } = require('../config/database');

const Room = {
  async create(projectId, name, createdBy) {
    const result = await pool.query(
      `INSERT INTO rooms (project_id, name, created_by) 
       VALUES ($1, $2, $3) RETURNING *`,
      [projectId, name, createdBy]
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT r.*, p.name as project_name, u.username as creator_name
       FROM rooms r
       JOIN projects p ON r.project_id = p.id
       JOIN users u ON r.created_by = u.id
       WHERE r.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async findByProject(projectId) {
    const result = await pool.query(
      `SELECT r.*, u.username as creator_name
       FROM rooms r 
       JOIN users u ON r.created_by = u.id
       WHERE r.project_id = $1 
       ORDER BY r.created_at DESC`,
      [projectId]
    );
    return result.rows;
  },

  async delete(id) {
    await pool.query('DELETE FROM rooms WHERE id = $1', [id]);
  }
};

module.exports = Room;
