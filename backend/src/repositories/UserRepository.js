import pool from '../config/db.js';

class UserRepository {
  async getAll() {
    const { rows } = await pool.query(`
      SELECT id, username, name, email, role, active, created_at, updated_at
      FROM audit_quality.users
      ORDER BY name ASC
    `);
    return rows;
  }

  async getById(id) {
    const { rows } = await pool.query(
      `SELECT id, username, name, email, role, active, created_at, updated_at
       FROM audit_quality.users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  }

  async getByUsername(usernameOrEmail) {
    const { rows } = await pool.query(
      `SELECT * FROM audit_quality.users 
       WHERE username = $1 OR email = $1`,
      [usernameOrEmail]
    );
    return rows[0] || null;
  }

  async create({ username, password_hash, name, email, role, active }) {
    const { rows } = await pool.query(
      `INSERT INTO audit_quality.users (username, password, name, email, role, active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, name, email, role, active, created_at`,
      [username, password_hash, name, email || null, role, active ?? true]
    );
    return rows[0];
  }

  async update(id, { username, password_hash, name, email, role, active }) {
    const { rows, rowCount } = await pool.query(
      `UPDATE audit_quality.users SET
        username  = COALESCE($1, username),
        password  = COALESCE($2, password),
        name      = COALESCE($3, name),
        email     = COALESCE($4, email),
        role      = COALESCE($5, role),
        active    = COALESCE($6, active),
        updated_at = NOW()
      WHERE id = $7
      RETURNING id, username, name, email, role, active, updated_at`,
      [username, password_hash, name, email, role, active, id]
    );
    return { row: rows[0], rowCount };
  }

  async delete(id) {
    const { rowCount } = await pool.query(
      'DELETE FROM audit_quality.users WHERE id = $1',
      [id]
    );
    return rowCount;
  }
}

export default new UserRepository();
