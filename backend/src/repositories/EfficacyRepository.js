import pool from '../config/db.js';

class EfficacyRepository {
  /**
   * Busca evidências objetivas de uma CAPA
   */
  async findObjectiveEvidencesByCapaId(capaId) {
    const query = `
      SELECT * FROM audit_quality.capa_evidences 
      WHERE capa_id = $1 AND is_objective = true
    `;
    const result = await pool.query(query, [capaId]);
    return result.rows;
  }

  /**
   * BR-EVE-03: Busca reincidência pós-implementação
   * Considera documentos do mesmo fornecedor/categoria criados após a data de conclusão das CAPAs
   */
  async findPostImplementationRecurrence(supplier_id, category, implementation_date) {
    const query = `
      SELECT id, code, created_at 
      FROM audit_quality.documents
      WHERE supplier_id = $1 
        AND defect_category = $2
        AND created_at > $3
        AND status != 'CANCELADO'
      LIMIT 1
    `;
    const result = await pool.query(query, [supplier_id, category, implementation_date]);
    return result.rows[0] || null;
  }

  /**
   * Persiste a decisão soberana e retorna o UUID
   */
  async saveDecision({ document_id, decision, rules_applied, evidence_summary }) {
    const query = `
      INSERT INTO audit_quality.efficacy_decisions (document_id, decision, rules_applied, evidence_summary)
      VALUES ($1, $2, $3, $4)
      RETURNING id, created_at
    `;
    const result = await pool.query(query, [
      document_id, 
      decision, 
      JSON.stringify(rules_applied), 
      evidence_summary
    ]);
    return result.rows[0];
  }

  /**
   * Verifica se o documento possui uma decisão de encerramento definitiva recente
   */
  async getLastDecision(documentId) {
    const query = `
      SELECT * FROM audit_quality.efficacy_decisions 
      WHERE document_id = $1 
      ORDER BY created_at DESC 
      LIMIT 1
    `;
    const result = await pool.query(query, [documentId]);
    return result.rows[0] || null;
  }
}

export default new EfficacyRepository();
