import pool from '../config/db.js';

class ReportRepository {
  async save(data) {
    const { document_id, decision_uuid, file_name, file_hash, created_by } = data;
    const query = `
      INSERT INTO audit_quality.generated_documents 
        (document_id, decision_uuid, file_name, file_hash, created_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [document_id, decision_uuid, file_name, file_hash, created_by]);
    return result.rows[0];
  }

  async findByDocumentId(documentId) {
    const query = `
      SELECT gd.*, u.name as creator_name
      FROM audit_quality.generated_documents gd
      LEFT JOIN audit_quality.users u ON u.id = gd.created_by
      WHERE gd.document_id = $1
      ORDER BY gd.generated_at DESC
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows;
  }

  async getById(id) {
    const query = 'SELECT * FROM audit_quality.generated_documents WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0];
  }
}

export default new ReportRepository();
