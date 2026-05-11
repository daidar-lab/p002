import pool from '../config/db.js';

class PortalRepository {
  async saveLink({ document_id, supplier_id, expires_at, scope = 'EVIDENCE_SUBMISSION' }) {
    const query = `
      INSERT INTO audit_quality.magic_links (document_id, supplier_id, expires_at, scope)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [document_id, supplier_id, expires_at, scope]);
    return result.rows[0];
  }

  async findByTokenId(tokenId) {
    const query = 'SELECT * FROM audit_quality.magic_links WHERE token_id = $1';
    const result = await pool.query(query, [tokenId]);
    return result.rows[0] || null;
  }

  async markAsUsed(tokenId) {
    const query = 'UPDATE audit_quality.magic_links SET used_at = NOW() WHERE token_id = $1 RETURNING *';
    const result = await pool.query(query, [tokenId]);
    return result.rows[0];
  }

  /**
   * Busca dados para visualização do fornecedor (RNC + CAPAs + ACR)
   */
  async getPortalViewData(documentId) {
    const query = `
      SELECT 
        d.id, d.code, d.status, d.supplier_id, d.defect_category, d.item_description as rnc_description,
        s.name as supplier_name,
        rc.type as acr_type, rc.root_cause,
        (SELECT json_agg(c) FROM audit_quality.capas c WHERE c.document_id = d.id AND c.status != 'CANCELADO') as capas
      FROM audit_quality.documents d
      LEFT JOIN audit_quality.suppliers s ON s.id = d.supplier_id
      LEFT JOIN audit_quality.root_cause_analyses rc ON rc.document_id = d.id
      WHERE d.id = $1
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows[0];
  }
}

export default new PortalRepository();
