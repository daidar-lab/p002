import pool from '../config/db.js';

/**
 * DashboardService — Motor de Consultas Dinâmicas (Live Query)
 * CONFORMIDADE BR-DASH-01: Proibido uso de snapshots.
 */
class DashboardService {
  /**
   * Consolida todos os KPIs em uma única chamada otimizada
   * @param {object} filters { start, end, supplier_id, status }
   */
  async getStats(filters) {
    const { start, end, supplier_id } = filters;
    
    // Base de filtros comuns
    let whereClause = 'WHERE created_at >= $1 AND created_at <= $2';
    const params = [start, end];

    if (supplier_id) {
      whereClause += ' AND supplier_id = $3';
      params.push(supplier_id);
    }

    const client = await pool.connect();
    try {
      // 1. Volume por Tipo e Status (Agregação Única)
      const volumeRes = await client.query(`
        SELECT 
          type, 
          status, 
          COUNT(*) as count
        FROM audit_quality.documents
        ${whereClause}
        GROUP BY type, status
      `, params);

      // 2. MTTR (Mean Time To Resolution) - Apenas CONCLUIDOS
      const mttrRes = await client.query(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400)::numeric(10,2) as avg_days
        FROM audit_quality.documents
        ${whereClause} AND status = 'CONCLUIDO'
      `, params);

      // 3. NCs em Atraso (SLA Fornecedor > 10 dias úteis)
      // Nota: Simplificando para 14 dias corridos na query para performance, ou lógica de dias úteis no JS
      const delayedRes = await client.query(`
        SELECT COUNT(*) as count
        FROM audit_quality.documents
        ${whereClause} AND status = 'ENVIADO_FORNECEDOR'
        AND sent_to_supplier_at < NOW() - INTERVAL '14 days'
      `, params);

      // 4. Reincidência (Documentos vinculados ou com histórico recorrente)
      const recurrenceRes = await client.query(`
        SELECT COUNT(*) as count
        FROM audit_quality.documents
        ${whereClause} AND parent_doc_id IS NOT NULL
      `, params);

      // 5. SLA de Resposta (Dentro vs Fora do Prazo)
      // Consideramos documentos que saíram de ENVIADO_FORNECEDOR
      const slaRes = await client.query(`
        SELECT 
          CASE 
            WHEN EXTRACT(EPOCH FROM (updated_at - sent_to_supplier_at))/86400 <= 14 THEN 'DENTRO'
            ELSE 'FORA'
          END as sla_status,
          COUNT(*) as count
        FROM audit_quality.documents
        ${whereClause} AND sent_to_supplier_at IS NOT NULL AND status != 'ENVIADO_FORNECEDOR'
        GROUP BY sla_status
      `, params);

      return {
        volume: volumeRes.rows,
        mttr: mttrRes.rows[0]?.avg_days || 0,
        delayedCount: delayedRes.rows[0]?.count || 0,
        recurrenceCount: recurrenceRes.rows[0]?.count || 0,
        slaPerformance: slaRes.rows,
        generated_at: new Date().toISOString()
      };
    } finally {
      client.release();
    }
  }
}

export default new DashboardService();
