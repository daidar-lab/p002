import pool from '../config/db.js';

class AuditRepository {
  /**
   * Auditoria de Fluxo: Lead times e gargalos
   */
  async analyzeFlow(start, end) {
    const query = `
      WITH status_changes AS (
        SELECT 
          document_id,
          created_at,
          action,
          detail,
          LAG(created_at) OVER (PARTITION BY document_id ORDER BY created_at) as prev_time
        FROM audit_quality.audit_logs
        WHERE created_at BETWEEN $1 AND $2
          AND action = 'Status alterado'
      )
      SELECT 
        COUNT(*) as total_transitions,
        AVG(created_at - prev_time) as avg_transition_time,
        detail as transition_path,
        COUNT(*) FILTER (WHERE (created_at - prev_time) > interval '48 hours') as late_transitions
      FROM status_changes
      WHERE prev_time IS NOT NULL
      GROUP BY detail
    `;
    const result = await pool.query(query, [start, end]);
    return result.rows;
  }

  /**
   * Auditoria de Decisão: Taxa de eficácia e bloqueios
   */
  async analyzeDecisions(start, end) {
    const query = `
      SELECT 
        decision,
        COUNT(*) as count,
        COUNT(DISTINCT document_id) as unique_documents
      FROM audit_quality.efficacy_decisions
      WHERE created_at BETWEEN $1 AND $2
      GROUP BY decision
    `;
    const result = await pool.query(query, [start, end]);
    return result.rows;
  }

  /**
   * Auditoria de Assinaturas: Latência por papel
   */
  async analyzeSignatures(start, end) {
    const query = `
      SELECT 
        s.role,
        COUNT(*) as total_signatures,
        AVG(s.signed_at - ed.created_at) as avg_latency
      FROM audit_quality.signatures s
      JOIN audit_quality.efficacy_decisions ed ON ed.id = s.decision_uuid
      WHERE s.signed_at BETWEEN $1 AND $2
      GROUP BY s.role
    `;
    const result = await pool.query(query, [start, end]);
    return result.rows;
  }

  /**
   * Auditoria de Reincidência: Padrões de falha
   */
  async analyzeRecurrence(start, end) {
    const query = `
      SELECT 
        s.name as supplier_name,
        d.defect_category,
        COUNT(*) as total_occurrences
      FROM audit_quality.documents d
      JOIN audit_quality.suppliers s ON s.id = d.supplier_id
      WHERE d.created_at BETWEEN $1 AND $2
      GROUP BY s.name, d.defect_category
      ORDER BY total_occurrences DESC
    `;
    const result = await pool.query(query, [start, end]);
    return result.rows;
  }

  async saveAudit(data) {
    const { audit_type, period_start, period_end, result_snapshot, executed_by } = data;
    const query = `
      INSERT INTO audit_quality.process_audits 
        (audit_type, period_start, period_end, result_snapshot, executed_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [audit_type, period_start, period_end, result_snapshot, executed_by]);
    return result.rows[0];
  }

  async getHistory() {
    const query = `
      SELECT pa.*, u.name as executor_name
      FROM audit_quality.process_audits pa
      LEFT JOIN audit_quality.users u ON u.id = pa.executed_by
      ORDER BY pa.generated_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }
}

export default new AuditRepository();
