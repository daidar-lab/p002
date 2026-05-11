import pool from '../config/db.js';

class SignatureRepository {
  /**
   * Busca todas as assinaturas de um documento com dados de auditoria
   */
  async getByDocumentId(documentId) {
    const query = `
      SELECT s.*, u.name as user_name 
      FROM audit_quality.signatures s
      LEFT JOIN audit_quality.users u ON u.id::text = s.user_id
      WHERE s.document_id = $1
      ORDER BY s.requested_at ASC
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows;
  }

  /**
   * Despacho Paralelo (Atomic Transaction)
   */
  async dispatchParallel(documentId, roles, slaDeadline) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const requestedAt = new Date().toISOString(); // SYSTEM_UTC_ONLY por padrão do Node se configurado

      for (const role of roles) {
        const query = `
          INSERT INTO audit_quality.signatures (document_id, role, status, requested_at, sla_deadline)
          VALUES ($1, $2, 'PENDING', $3, $4)
          ON CONFLICT (document_id, role) DO NOTHING
        `;
        await client.query(query, [documentId, role, requestedAt, slaDeadline]);
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateToSigned(signatureId, userId, stateHash) {
    const query = `
      UPDATE audit_quality.signatures 
      SET status = 'SIGNED', user_id = $1, signed_at = NOW(), state_hash = $2
      WHERE id = $3 AND status != 'SIGNED'
      RETURNING *
    `;
    const result = await pool.query(query, [userId, stateHash, signatureId]);
    return result.rows[0];
  }

  async updateEscalation(signatureId, level) {
    const query = `
      UPDATE audit_quality.signatures 
      SET status = 'ESCALATED', escalation_level = $1
      WHERE id = $2 AND status = 'PENDING'
    `;
    await pool.query(query, [level, signatureId]);
  }

  async getExpiredSignatures() {
    const query = `
      SELECT s.*, d.severity
      FROM audit_quality.signatures s
      JOIN audit_quality.documents d ON d.id = s.document_id
      WHERE s.status = 'PENDING' AND s.sla_deadline < NOW()
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

export default new SignatureRepository();
