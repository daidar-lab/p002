class SeverityService {
  /**
   * Motor de Decisão Determinístico para Severidade (SPEC SD-SV-AUTO)
   */
  calculateSeverity(data) {
    const { 
      type, 
      occurrence_context, 
      audit_finding_type, 
      impact_regulatory, 
      impact_customer, 
      impact_production 
    } = data;

    const evaluationBasis = [];

    // IR-02 / VR-SV-07: RAQ NÃO possui severidade
    if (type === 'RAQ') {
      return { severity: 'NOT_APPLICABLE', basis: ['TIPO_RAQ_ISENTO'] };
    }

    // IR-03 / VR-SV-08: RHE NÃO avalia severidade para SLA
    if (type === 'RHE') {
      return { severity: 'NOT_APPLICABLE', basis: ['TIPO_RHE_ISENTO'] };
    }

    // --- REGRAS PARA RNC ---

    // VR-SV-01: Audit Major
    if (occurrence_context === 'AUDIT' && audit_finding_type === 'MAJOR') {
      return { severity: 'CRITICAL', basis: ['AUDIT_MAJOR_FINDING'] };
    }

    // VR-SV-02: Impacto Regulatório (MAPA/Anvisa)
    if (impact_regulatory === true || impact_regulatory === 'true') {
      return { severity: 'CRITICAL', basis: ['REGULATORY_IMPACT_DETECTED'] };
    }

    // VR-SV-03: Impacto em Cliente
    if (impact_customer === true || impact_customer === 'true') {
      evaluationBasis.push('CUSTOMER_IMPACT');
    }

    // VR-SV-04: Bloqueio de Produção/Lote
    if (impact_production === true || impact_production === 'true') {
      evaluationBasis.push('PRODUCTION_BLOCK');
    }

    if (evaluationBasis.length > 0) {
      return { severity: 'HIGH', basis: evaluationBasis };
    }

    // VR-SV-05: Retrabalho Interno (Processo)
    if (occurrence_context === 'PROCESS') {
      return { severity: 'MEDIUM', basis: ['INTERNAL_REWORK_ONLY'] };
    }

    // VR-SV-06: Padrão
    return { severity: 'LOW', basis: ['STANDARD_OPERATIONAL_DEVIATION'] };
  }
}

export default new SeverityService();
