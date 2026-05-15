import pool from '../config/db.js';

class PortalRepository {
  async saveLink({ document_id, rvt_id, supplier_id, expires_at, scope = 'EVIDENCE_SUBMISSION' }, client = null) {
    const query = `
      INSERT INTO audit_quality.magic_links (document_id, rvt_id, supplier_id, expires_at, scope)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const db = client || pool;
    const result = await db.query(query, [document_id || null, rvt_id || null, supplier_id, expires_at, scope]);
    return result.rows[0];
  }

  async findByTokenId(tokenId) {
    const query = 'SELECT * FROM audit_quality.magic_links WHERE token_id = $1';
    const result = await pool.query(query, [tokenId]);
    return result.rows[0] || null;
  }

  async markAsUsed(tokenId, client = null) {
    const query = 'UPDATE audit_quality.magic_links SET used_at = NOW() WHERE token_id = $1 RETURNING *';
    const db = client || pool;
    const result = await db.query(query, [tokenId]);
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

  /**
   * Busca dados de RVT para o Portal
   */
  async getPortalRvtData(rvtId) {
    const query = `
      SELECT 
        r.*, 
        s.name as supplier_name,
        (
          SELECT json_agg(json_build_object('code', d.code, 'description', d.item_description))
          FROM audit_quality.rvt_links rl
          JOIN audit_quality.documents d ON d.id = rl.document_id
          WHERE rl.rvt_id = r.id
        ) as linked_rncs
      FROM audit_quality.rvts r
      JOIN audit_quality.suppliers s ON s.id = r.supplier_id
      WHERE r.id = $1
    `;
    const result = await pool.query(query, [rvtId]);
    return result.rows[0];
  }
}

export default new PortalRepository();
