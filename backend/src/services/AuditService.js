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
    return await this.queryAudit(type, start, end);
  }

  /**
   * Executa a análise sem persistir snapshot (BR-AUD-LIVE)
   */
  async queryAudit(type, start, end) {
    let rawData;
    let resultSnapshot = {};

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

    return resultSnapshot;
  }

  /**
   * Persistência Soberana do Snapshot (BR-AUD-EXECUTOR)
   * @deprecated Auditoria baseada em query é preferida (BR-AUD-QUERY)
   */
  async _saveAudit(type, start, end, resultSnapshot, executedBy) {
    return await AuditRepository.saveAudit({
      audit_type: type,
      period_start: start,
      period_end: end,
      result_snapshot: resultSnapshot,
      executed_by: executedBy
    });
  }

  /**
   * Disparo automatizado para Auditoria Geral (30 dias)
   */
  async generateAutoSnapshots(executedBy) {
    const end = new Date().toISOString();
    const start = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Dispara tipos críticos em paralelo
    const types = ['FLOW', 'SIGNATURE', 'DECISION'];
    const results = [];
    
    for (const type of types) {
      try {
        const res = await this.runAudit(type, start, end, executedBy);
        results.push(res);
      } catch (e) {
        console.error(`Falha ao gerar snapshot ${type}:`, e.message);
      }
    }
    
    return { success: true, count: results.length };
  }

  _intervalToMs(interval) {
    if (!interval) return 0;
    if (typeof interval === 'number') return interval;
    
    // Converte objeto de intervalo do PG para MS
    let ms = 0;
    if (interval.days) ms += interval.days * 24 * 60 * 60 * 1000;
    if (interval.hours) ms += interval.hours * 60 * 60 * 1000;
    if (interval.minutes) ms += interval.minutes * 60 * 1000;
    if (interval.seconds) ms += interval.seconds * 1000;
    if (interval.milliseconds) ms += interval.milliseconds;
    
    return ms;
  }

  async getHistory() {
    return await AuditRepository.getHistory();
  }
}

export default new AuditService();
