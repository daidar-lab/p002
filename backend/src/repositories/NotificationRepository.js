import pool from '../config/db.js';

class NotificationRepository {
  async getRecipientsByCategory(category) {
    const query = `
      SELECT email 
      FROM audit_quality.notification_matrix 
      WHERE defect_category = $1 AND is_active = true
    `;
    const result = await pool.query(query, [category]);
    return result.rows.map(r => r.email);
  }

  async getAll() {
    const query = 'SELECT * FROM audit_quality.notification_matrix ORDER BY defect_category, role_name';
    const result = await pool.query(query);
    return result.rows;
  }

  async save(data) {
    const { defect_category, role_name, email, is_active } = data;
    const query = `
      INSERT INTO audit_quality.notification_matrix (defect_category, role_name, email, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [defect_category, role_name, email, is_active]);
    return result.rows[0];
  }

  async update(id, data) {
    const { defect_category, role_name, email, is_active } = data;
    const query = `
      UPDATE audit_quality.notification_matrix 
      SET defect_category = $1, role_name = $2, email = $3, is_active = $4
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(query, [defect_category, role_name, email, is_active, id]);
    return result.rows[0];
  }

  async delete(id) {
    await pool.query('DELETE FROM audit_quality.notification_matrix WHERE id = $1', [id]);
  }
}

export default new NotificationRepository();
