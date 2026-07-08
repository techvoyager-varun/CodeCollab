const { pool } = require('../config/database');

const Project = {
  async create(name, description, ownerId, language) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO projects (name, description, owner_id, language) 
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [name, description || '', ownerId, language || 'javascript']
      );

      const project = result.rows[0];

      // Add owner as member
      await client.query(
        `INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, 'owner')`,
        [project.id, ownerId]
      );

      await client.query('COMMIT');
      return project;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async findByUser(userId) {
    const result = await pool.query(
      `SELECT p.*, u.username as owner_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM files WHERE project_id = p.id AND type = 'file') as file_count
       FROM projects p
       JOIN project_members pm ON p.id = pm.project_id
       JOIN users u ON p.owner_id = u.id
       WHERE pm.user_id = $1
       ORDER BY p.created_at DESC`,
      [userId]
    );
    return result.rows;
  },

  async findById(id) {
    const result = await pool.query(
      `SELECT p.*, u.username as owner_name
       FROM projects p 
       JOIN users u ON p.owner_id = u.id 
       WHERE p.id = $1`,
      [id]
    );
    return result.rows[0];
  },

  async update(id, fields) {
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
      `UPDATE projects SET ${sets.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    return result.rows[0];
  },

  async delete(id) {
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
  },

  async addMember(projectId, userId, role = 'editor') {
    await pool.query(
      `INSERT INTO project_members (project_id, user_id, role) 
       VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [projectId, userId, role]
    );
  },

  async removeMember(projectId, userId) {
    await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
  },

  async getMembers(projectId) {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.avatar_color, pm.role, pm.joined_at
       FROM project_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.project_id = $1
       ORDER BY pm.joined_at`,
      [projectId]
    );
    return result.rows;
  },

  async isMember(projectId, userId) {
    const result = await pool.query(
      'SELECT 1 FROM project_members WHERE project_id = $1 AND user_id = $2',
      [projectId, userId]
    );
    return result.rows.length > 0;
  }
};

module.exports = Project;
