import pool from '../config/db.js';

class DocumentRepository {
  async getAllWithSuppliers() {
    const query = `
      SELECT
        d.id,
        d.code,
        d.type,
        d.status,
        d.item_description,
        d.defect_category,
        d.supplier_id,
        s.name   AS supplier_name,
        s.email  AS supplier_email,
        d.gut_gravity,
        d.gut_urgency,
        d.gut_tendency,
        (d.gut_gravity * d.gut_urgency * d.gut_tendency) AS gut_score,
        d.created_at,
        d.updated_at
      FROM audit_quality.documents d
      LEFT JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      ORDER BY d.created_at DESC
    `;
    try {
      const result = await pool.query(query);
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar documentos:', error.message);
      throw error;
    }
  }

  async getById(id) {
    const query = `
      SELECT
        d.*,
        s.name  AS supplier_name,
        s.email AS supplier_email,
        (d.gut_gravity * d.gut_urgency * d.gut_tendency) AS gut_score
      FROM audit_quality.documents d
      LEFT JOIN audit_quality.suppliers s ON d.supplier_id = s.id
      WHERE d.id = $1
    `;
    try {
      const result = await pool.query(query, [id]);
      return result.rows[0] || null;
    } catch (error) {
      console.error(`Erro ao buscar documento ${id}:`, error.message);
      throw error;
    }
  }

  async getTimeline(documentId) {
    const query = `
      SELECT *
      FROM audit_quality.audit_logs
      WHERE document_id = $1
      ORDER BY created_at DESC
    `;
    try {
      const result = await pool.query(query, [documentId]);
      return result.rows;
    } catch (error) {
      console.error(`Erro ao buscar timeline do doc ${documentId}:`, error.message);
      throw error;
    }
  }
}

export default new DocumentRepository();
