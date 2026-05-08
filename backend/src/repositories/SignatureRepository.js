import pool from '../config/db.js';

class SignatureRepository {
  /**
   * Busca papéis obrigatórios para o tipo de documento na configuração soberana
   */
  async getRequiredRoles(documentType) {
    const query = 'SELECT role FROM audit_quality.signature_roles_required WHERE document_type = $1';
    const result = await pool.query(query, [documentType]);
    return result.rows.map(r => r.role);
  }

  /**
   * Lista assinaturas realizadas para um documento e uma decisão técnica específica
   */
  async getSignaturesByDecision(documentId, decisionUuid) {
    const query = `
      SELECT s.*, u.name as user_name 
      FROM audit_quality.signatures s
      JOIN audit_quality.users u ON u.id = s.user_id
      WHERE s.document_id = $1 AND s.decision_uuid = $2
    `;
    const result = await pool.query(query, [documentId, decisionUuid]);
    return result.rows;
  }

  async save(data) {
    const { document_id, user_id, role, decision_uuid, signature_hash } = data;
    const query = `
      INSERT INTO audit_quality.signatures (document_id, user_id, role, decision_uuid, signature_hash)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [document_id, user_id, role, decision_uuid, signature_hash]);
    return result.rows[0];
  }

  async hasRoleSignedDecision(documentId, role, decisionUuid) {
    const query = `
      SELECT id FROM audit_quality.signatures 
      WHERE document_id = $1 AND role = $2 AND decision_uuid = $3
    `;
    const result = await pool.query(query, [documentId, role, decisionUuid]);
    return result.rowCount > 0;
  }
}

export default new SignatureRepository();
