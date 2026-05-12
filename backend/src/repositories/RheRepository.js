import pool from '../config/db.js';

class RheRepository {
  async create(data) {
    const query = `
      INSERT INTO audit_quality.rhes (
        phase, object_type, supplier_id, packaging_id, production_line, related_initial_rhe_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const values = [
      data.phase, data.object_type, data.supplier_id, data.packaging_id, 
      data.production_line, data.related_initial_rhe_id, data.created_by
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async getById(id) {
    const query = `
      SELECT r.*, s.name as supplier_name, u.name as creator_name, gu.name as gate_executor_name
      FROM audit_quality.rhes r
      LEFT JOIN audit_quality.suppliers s ON s.id = r.supplier_id
      LEFT JOIN audit_quality.users u ON u.id = r.created_by
      LEFT JOIN audit_quality.users gu ON gu.id = r.gate_executed_by
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }

  async updateStatus(id, status, userId) {
    const query = `
      UPDATE audit_quality.rhes 
      SET status = $1, gate_executed_by = $2, gate_executed_at = NOW(), updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const result = await pool.query(query, [status, userId, id]);
    return result.rows[0];
  }

  async saveChecklist(rheId, items) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of items) {
        const query = `
          INSERT INTO audit_quality.rhe_checklists (rhe_id, item_id, approved, evidence_ref, comment)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (rhe_id, item_id) DO UPDATE SET
            approved = EXCLUDED.approved,
            evidence_ref = EXCLUDED.evidence_ref,
            comment = EXCLUDED.comment
        `;
        await client.query(query, [rheId, item.item_id, item.approved, item.evidence_ref, item.comment]);
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getChecklist(rheId) {
    const query = `SELECT * FROM audit_quality.rhe_checklists WHERE rhe_id = $1`;
    const result = await pool.query(query, [rheId]);
    return result.rows;
  }

  async list(filters = {}) {
    let query = `
      SELECT r.*, s.name as supplier_name 
      FROM audit_quality.rhes r
      LEFT JOIN audit_quality.suppliers s ON s.id = r.supplier_id
      ORDER BY r.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

export default new RheRepository();
