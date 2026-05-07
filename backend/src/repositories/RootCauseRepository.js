import pool from '../config/db.js';

class RootCauseRepository {
  async findByDocumentId(documentId) {
    const query = 'SELECT * FROM audit_quality.root_cause_analyses WHERE document_id = $1';
    const result = await pool.query(query, [documentId]);
    return result.rows[0] || null;
  }

  async save(documentId, { type, data, root_cause }) {
    const client = await pool.connect();
    try {
      const existing = await this.findByDocumentId(documentId);
      
      if (existing) {
        const query = `
          UPDATE audit_quality.root_cause_analyses
          SET type = $1, data = $2, root_cause = $3, updated_at = NOW()
          WHERE document_id = $4
          RETURNING *
        `;
        const result = await pool.query(query, [type, JSON.stringify(data), root_cause, documentId]);
        return result.rows[0];
      } else {
        const query = `
          INSERT INTO audit_quality.root_cause_analyses (document_id, type, data, root_cause)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        const result = await pool.query(query, [documentId, type, JSON.stringify(data), root_cause]);
        return result.rows[0];
      }
    } finally {
      client.release();
    }
  }
}

export default new RootCauseRepository();
