import pool from '../config/db.js';

class CapaRepository {
  /**
   * Busca apenas CAPAs ativas (ignora Canceladas) para validação de workflow
   */
  async findActiveByDocumentId(documentId) {
    const query = `
      SELECT * 
      FROM audit_quality.capas 
      WHERE document_id = $1 
        AND status IN ('PENDENTE', 'CONCLUIDO')
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows;
  }

  async save(documentId, data) {
    const { type, description, root_cause_link, responsible, due_date, efficacy_criteria, status } = data;
    
    const query = `
      INSERT INTO audit_quality.capas 
        (document_id, type, description, root_cause_link, responsible, due_date, efficacy_criteria, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [
      documentId, type, description, root_cause_link, responsible, due_date, efficacy_criteria, status || 'PENDENTE'
    ]);
    return result.rows[0];
  }
}

export default new CapaRepository();
