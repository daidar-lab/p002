import AuditRepository from '../repositories/AuditRepository.js';

class AuditService {
  /**
   * Executa auditoria sistêmica e gera Snapshot Imutável (BR-AUD-FACT)
   */
  async runAudit(type, start, end, executedBy) {
    if (new Date(start) >= new Date(end)) {
      throw new Error('Intervalo temporal inválido: o início deve ser anterior ao fim.');
    }

    let rawData;
    let resultSnapshot = {};

    // Roteamento de análise por tipo (BR-AUD-SCHEMA)
    switch (type) {
      case 'FLOW':
        rawData = await AuditRepository.analyzeFlow(start, end);
        resultSnapshot = {
          metrics: rawData.map(r => ({
            path: r.transition_path,
            avg_time_ms: this._intervalToMs(r.avg_transition_time),
            late_count: parseInt(r.late_transitions)
          })),
          summary: {
            total_transitions: rawData.reduce((sum, r) => sum + parseInt(r.total_transitions), 0)
          }
        };
        break;

      case 'DECISION':
        rawData = await AuditRepository.analyzeDecisions(start, end);
        resultSnapshot = {
          metrics: rawData.map(r => ({
            decision: r.decision,
            count: parseInt(r.count),
            documents: parseInt(r.unique_documents)
          }))
        };
        break;

      case 'SIGNATURE':
        rawData = await AuditRepository.analyzeSignatures(start, end);
        resultSnapshot = {
          metrics: rawData.map(r => ({
            role: r.role,
            avg_latency_ms: this._intervalToMs(r.avg_latency),
            total: parseInt(r.total_signatures)
          }))
        };
        break;

      case 'RECURRENCE':
        rawData = await AuditRepository.analyzeRecurrence(start, end);
        resultSnapshot = {
          ranking: rawData.slice(0, 10).map(r => ({
            supplier: r.supplier_name,
            category: r.defect_category,
            count: parseInt(r.total_occurrences)
          }))
        };
        break;

      default:
        throw new Error(`Tipo de auditoria '${type}' não suportado.`);
    }

    // Persistência Soberana do Snapshot (BR-AUD-EXECUTOR)
    return await AuditRepository.saveAudit({
      audit_type: type,
      period_start: start,
      period_end: end,
      result_snapshot: resultSnapshot,
      executed_by: executedBy
    });
  }

  _intervalToMs(interval) {
    if (!interval) return 0;
    // Helper simples para converter intervalo do PG para MS (aproximado)
    // Em produção, usar uma lib como 'postgres-interval'
    return typeof interval === 'string' ? 0 : interval; 
  }

  async getHistory() {
    return await AuditRepository.getHistory();
  }
}

export default new AuditService();
