import pool from '../config/db.js';

class DispositionService {
  /**
   * MATRIZ DE DISPOSIÇÃO PERMITIDA (IR-04 / 4.1)
   */
  ALLOWED_MATRIX = {
    'RNC': [
      'RELEASE_WITH_RESTRICTION',
      'RELEASE_UNDER_CONCESSION',
      'BLOCK_FOR_REWORK',
      'RETURN_OR_REIMBURSE'
    ],
    'RAQ': [
      'SCRAP_OR_DESTROY'
    ],
    'RHE': [
      'APPROVE',
      'REJECT',
      'APPROVE_WITH_CONDITIONS'
    ]
  };

  /**
   * Registra a Disposição de Material (GATE 5-9)
   */
  /**
   * Deterministic Decision Engine for NC Closure (STRICT)
   */
  async decideClosure(input) {
    const { 
      ncType, 
      ncStatus,
      materialDisposition, 
      capaStatus, 
      effectivenessRequired,
      effectivenessStatus,
      exportFlag,
      approvals = []
    } = input;

    // DR-01 If ncStatus == CLOSED → REJECT
    if (ncStatus === 'CONCLUIDO' || ncStatus === 'CLOSED') {
      return { decision: "DENY", reasonCode: "IMMUTABLE_STATE" };
    }

    // DR-02 If materialDisposition is null → DENY
    if (!materialDisposition) {
      return { decision: "DENY", reasonCode: "MISSING_DISPOSITION" };
    }

    // DR-03 If capaStatus != COMPLETED → DENY
    if (capaStatus !== 'COMPLETED') {
      return { decision: "DENY", reasonCode: "CAPA_INCOMPLETE" };
    }

    // DR-04 If effectivenessRequired == true AND effectivenessStatus != APPROVED → DENY
    if (effectivenessRequired === true && effectivenessStatus !== 'APPROVED') {
      return { decision: "DENY", reasonCode: "EFFECTIVENESS_PENDING" };
    }

    // DR-05 & DR-06 Allowed dispositions by ncType
    if (!this.ALLOWED_MATRIX[ncType]?.includes(materialDisposition)) {
      return { decision: "DENY", reasonCode: "INVALID_DISPOSITION" };
    }

    // DR-07 If materialDisposition == RELEASE_UNDER_CONCESSION
    if (materialDisposition === 'RELEASE_UNDER_CONCESSION') {
      if (!approvals.some(a => a.role === 'QUALITY_COORDINATOR' && a.approved)) {
        return { decision: "HOLD", reasonCode: "MISSING_APPROVAL" };
      }
      if (exportFlag === true && !approvals.some(a => a.role === 'COMEX' && a.approved)) {
        return { decision: "HOLD", reasonCode: "MISSING_APPROVAL" };
      }
    }

    // DR-08 If materialDisposition == RETURN_OR_REIMBURSE
    if (materialDisposition === 'RETURN_OR_REIMBURSE') {
      if (!approvals.some(a => a.role === 'LOGISTICS' && a.approved)) {
        return { decision: "HOLD", reasonCode: "MISSING_APPROVAL" };
      }
    }

    // Se passou por todas as regras invariantes
    return { decision: "APPROVE_CLOSURE" };
  }

  async setDisposition(documentId, { disposition, userId, role, additionalApprovals = [] }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const docResult = await client.query(`
        SELECT d.type, d.status, 
               (SELECT COUNT(*) FROM audit_quality.capas 
                WHERE document_id = d.id 
                AND status NOT IN ('CONCLUIDO', 'IMPLEMENTADO')) as pending_capas
        FROM audit_quality.documents d WHERE d.id = $1
      `, [documentId]);
      
      if (docResult.rowCount === 0) throw new Error('Documento não encontrado');
      const doc = docResult.rows[0];

      // Mapeia aprovações para o formato STRICT
      const approvals = additionalApprovals.map(a => ({ role: a.role, approved: true }));

      const engineInput = {
        ncId: documentId,
        ncType: doc.type,
        ncStatus: doc.status,
        materialDisposition: disposition,
        capaStatus: Number(doc.pending_capas) === 0 ? 'COMPLETED' : 'NOT_COMPLETED',
        effectivenessRequired: doc.type === 'RNC',
        effectivenessStatus: 'APPROVED', // Fluxo verificado no DocumentService
        exportFlag: false, // Expansível via metadata
        approvals: approvals
      };

      const result = await this.decideClosure(engineInput);

      if (result.decision === 'DENY' || result.decision === 'HOLD') {
        const err = new Error(result.reasonCode);
        err.decision = result.decision;
        throw err;
      }

      // Persistência Final
      await client.query(`
        UPDATE audit_quality.documents 
        SET material_disposition = $1, disposition_by = $2, disposition_at = NOW(), status = 'CONCLUIDO'
        WHERE id = $3
      `, [disposition, userId, documentId]);

      for (const approval of additionalApprovals) {
        await client.query(`
          INSERT INTO audit_quality.disposition_approvals (document_id, role, approved_by, reference_id)
          VALUES ($1, $2, $3, $4)
        `, [documentId, approval.role, approval.approved_by, approval.reference_id || null]);
      }

      await client.query('COMMIT');
      return { decision: "APPROVE_CLOSURE" };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Retorna os dados de disposição (Output Contract)
   */
  async getDisposition(documentId) {
    const docResult = await pool.query(`
      SELECT material_disposition as "materialDisposition", disposition_at as "decisionTimestamp", disposition_by
      FROM audit_quality.documents WHERE id = $1
    `, [documentId]);

    if (docResult.rowCount === 0) return null;

    const approvalsResult = await pool.query(`
      SELECT role, approved_by as "approvedBy", timestamp 
      FROM audit_quality.disposition_approvals WHERE document_id = $1
    `, [documentId]);

    return {
      ...docResult.rows[0],
      additionalApprovals: approvalsResult.rows,
      locked: true
    };
  }
}

export default new DispositionService();
