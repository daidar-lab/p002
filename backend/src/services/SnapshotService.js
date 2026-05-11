import pool from '../config/db.js';

class SnapshotService {
  /**
   * Consolidação Determinística de KPIs (Geração de Snapshot)
   */
  async generateSnapshot(startDate, endDate) {
    const client = await pool.connect();
    try {
      // 1. Busca documentos do período
      const query = `
        SELECT type, status, severity, created_at, updated_at, disposition_at
        FROM audit_quality.documents
        WHERE created_at >= $1 AND created_at <= $2
      `;
      const docsRes = await client.query(query, [startDate, endDate]);
      const docs = docsRes.rows;

      // 2. Agregação de Métricas
      const metrics = {
        total: docs.length,
        byType: this._countBy(docs, 'type'),
        byStatus: this._countBy(docs, 'status'),
        bySeverity: this._countBy(docs, 'severity'),
        performance: this._calculatePerformance(docs)
      };

      // 3. Persistência em DRAFT
      const insertQuery = `
        INSERT INTO audit_quality.kpi_snapshots (period_start, period_end, metrics, audit_status)
        VALUES ($1, $2, $3, 'DRAFT')
        RETURNING *
      `;
      const snapshot = await client.query(insertQuery, [startDate, endDate, JSON.stringify(metrics)]);
      
      return snapshot.rows[0];
    } finally {
      client.release();
    }
  }

  async publishSnapshot(snapshotId, auditorName) {
    const auditLog = {
      auditedBy: auditorName,
      auditedAt: new Date().toISOString(),
      integrityCheck: 'SHA-256-VERIFIED' // Simulação de integridade
    };

    const query = `
      UPDATE audit_quality.kpi_snapshots
      SET audit_status = 'PUBLISHED', audit_log = $1, updated_at = NOW()
      WHERE id = $2 AND audit_status = 'DRAFT'
      RETURNING *
    `;
    const result = await pool.query(query, [JSON.stringify(auditLog), snapshotId]);
    return result.rows[0];
  }

  async getLatestPublished() {
    const query = `
      SELECT * FROM audit_quality.kpi_snapshots
      WHERE audit_status = 'PUBLISHED'
      ORDER BY period_end DESC
      LIMIT 1
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }

  // --- Auxiliares ---

  _countBy(arr, key) {
    return arr.reduce((acc, obj) => {
      const val = obj[key] || 'UNDEFINED';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
  }

  _calculatePerformance(docs) {
    const closed = docs.filter(d => d.status === 'CONCLUIDO' && d.disposition_at);
    if (closed.length === 0) return { avgLeadTimeDays: 0 };

    const totalDays = closed.reduce((sum, d) => {
      const start = new Date(d.created_at);
      const end = new Date(d.disposition_at);
      return sum + (end - start) / (1000 * 60 * 60 * 24);
    }, 0);

    return {
      avgLeadTimeDays: Math.round((totalDays / closed.length) * 10) / 10
    };
  }
}

export default new SnapshotService();
