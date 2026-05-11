import DocumentRepository from '../repositories/DocumentRepository.js';
import RootCauseRepository from '../repositories/RootCauseRepository.js';
import CapaRepository from '../repositories/CapaRepository.js';
import EfficacyRepository from '../repositories/EfficacyRepository.js';
import SignatureService from './SignatureService.js';
import MailService from './MailService.js';
import PortalService from './PortalService.js';
import pool from '../config/db.js';

class DocumentService {
  async listDashboard() {
    return await DocumentRepository.getAllWithSuppliers();
  }

  /**
   * Motor Determinístico de Decisão de Reincidência (BR-05 / RF-019)
   */
  async evaluateRecurrence(supplier_id, defect_category) {
    if (!supplier_id || !defect_category) {
      return { decision: 'INSUFFICIENT_CONTEXT' };
    }

    const raqs = await DocumentRepository.findValidRAQsForRecurrence(supplier_id, defect_category);
    
    // Contagem de RAQs válidas (janela de 12 meses já filtrada no repositório)
    if (raqs.length < 2) {
      return {
        decision: 'ALLOW_RAQ',
        rule_applied: 'BR-05',
        deterministic: true,
        history_count: raqs.length
      };
    }

    return {
      decision: 'ESCALATE_TO_RNC',
      rule_applied: 'BR-05',
      deterministic: true,
      history_count: raqs.length,
      evidence_ids: raqs.map(r => r.id)
    };
  }

  async create(data, user = 'sistema') {
    const {
      type = 'RNC',
      supplier_id = null,
      defect_category = 'QUALIDADE',
      item_description
    } = data;

    if (!item_description) {
      return {
        error: true,
        status: 400,
        message: 'A descrição do item é obrigatória.'
      };
    }

    // 1. Interceptação para regra de reincidência (BR-05)
    if (type === 'RAQ') {
      const evaluation = await this.evaluateRecurrence(supplier_id, defect_category);
      
      if (evaluation.decision === 'ESCALATE_TO_RNC') {
        console.log('🚨 BR-05: Escalonamento automático para RNC detectado.');
        return await this._executeEscalation(data, evaluation, user);
      }
    }

    // Fluxo normal de criação
    return await this._persistDocument(data);
  }

  async _executeEscalation(originalData, evaluation, user) {
    const { supplier_id, defect_category, item_description } = originalData;
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // A. Gera novo código para o RNC
      const newCode = await this._generateNextCode('RNC');

      // B. Cria o RNC automático
      const rncResult = await client.query(
        `INSERT INTO audit_quality.documents (
          code, type, status, supplier_id,
          item_description, defect_category, created_at
        ) VALUES ($1, 'RNC', 'ABERTO', $2, $3, $4, NOW())
        RETURNING *`,
        [newCode, supplier_id, `[ESCALONAMENTO BR-05] ${item_description}`, defect_category]
      );

      const newRnc = rncResult.rows[0];

      // C. Vincula RAQs de evidência
      await client.query(
        'UPDATE audit_quality.documents SET parent_doc_id = $1 WHERE id = ANY($2)',
        [newRnc.id, evaluation.evidence_ids]
      );

      // D. Registra Auditoria
      await client.query(
        `INSERT INTO audit_quality.audit_logs (document_id, action, detail, user_name)
         VALUES ($1, 'BR-05: Escalonamento', $2, $3)`,
        [
          newRnc.id, 
          `RNC criado automaticamente após detectar ${evaluation.history_count} RAQs reincidentes.`,
          user
        ]
      );

      await client.query('COMMIT');

      // E. Notificação (Side Effect contratual)
      const supplierResult = await pool.query('SELECT name FROM audit_quality.suppliers WHERE id = $1', [supplier_id]);
      const supplierName = supplierResult.rows[0]?.name || 'Fornecedor';

      MailService.sendRecurrenceAlert({
        rnc_code: newCode,
        supplier_name: supplierName,
        category: defect_category,
        raqs_count: evaluation.history_count
      });

      return {
        escalated: true,
        decision: evaluation.decision,
        rule_applied: evaluation.rule_applied,
        deterministic: true,
        data: newRnc
      };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async _persistDocument(data) {
    const {
      code,
      type = 'RNC',
      status = 'ABERTO',
      supplier_id = null,
      item_description,
      defect_category = 'QUALIDADE'
    } = data;

    let finalCode = code;
    if (!finalCode) {
      finalCode = await this._generateNextCode(type);
    }

    try {
      const result = await pool.query(
        `INSERT INTO audit_quality.documents (
          code, type, status, supplier_id,
          item_description, defect_category, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [finalCode, type, status, supplier_id || null, item_description, defect_category]
      );

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async _generateNextCode(type) {
    const result = await pool.query(
      "SELECT code FROM audit_quality.documents WHERE type = $1 ORDER BY id DESC LIMIT 1",
      [type]
    );
    const lastCode = result.rows[0]?.code;
    const year = new Date().getFullYear();
    
    if (!lastCode || !lastCode.includes(year.toString())) {
      return `${type}-${year}-001`;
    }
    
    // Formato: TYPE-YYYY-NNN
    const parts = lastCode.split('-');
    const sequence = parseInt(parts[2] || '0') + 1;
    return `${type}-${year}-${sequence.toString().padStart(3, '0')}`;
  }

  async update(documentId, data, changedBy = 'sistema') {
    const {
      code, type, status, supplier_id,
      item_description, defect_category
    } = data;

    try {
      // 1. Antes de atualizar, verifica se o status está mudando
      const current = await pool.query('SELECT status FROM audit_quality.documents WHERE id = $1', [documentId]);
      const oldStatus = current.rows[0]?.status;

      if (status && oldStatus && status !== oldStatus) {
        return await this.changeStatus(documentId, status, changedBy);
      }

      const result = await pool.query(
        `UPDATE audit_quality.documents SET
          code             = COALESCE($1, code),
          type             = COALESCE($2, type),
          status           = COALESCE($3, status),
          supplier_id      = COALESCE($4, supplier_id),
          item_description = COALESCE($5, item_description),
          defect_category  = COALESCE($6, defect_category),
          updated_at       = NOW()
        WHERE id = $7
        RETURNING *`,
        [
          code, type, status,
          supplier_id || null,
          item_description, defect_category,
          documentId
        ]
      );

      if (result.rowCount === 0) {
        return { error: true, status: 404, message: 'Documento não encontrado.' };
      }

      return { data: result.rows[0] };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  async delete(documentId) {
    try {
      const result = await pool.query(
        'DELETE FROM audit_quality.documents WHERE id = $1 RETURNING id',
        [documentId]
      );

      if (result.rowCount === 0) {
        return { error: true, status: 404, message: 'Documento não encontrado.' };
      }

      return { data: { deleted: true, id: documentId } };
    } catch (err) {
      return this._handleDbError(err);
    }
  }

  /**
   * Motor Determinístico de Validação de ACR (BR-ACR-01)
   */
  async evaluateACR(documentId) {
    if (!documentId) {
      return { decision: 'INSUFFICIENT_CONTEXT' };
    }

    const acr = await RootCauseRepository.findByDocumentId(documentId);

    if (!acr) {
      return {
        decision: 'BLOCK_WORKFLOW',
        rule_applied: 'BR-ACR-01',
        reason: 'Análise de Causa Raiz inexistente.',
        deterministic: true
      };
    }

    const { type, data } = acr;
    let isValid = false;

    if (type === '5_WHYS') {
      // Regra: Mínimo de 5 níveis respondidos
      const levels = data.levels || [];
      const answeredLevels = levels.filter(l => l && l.trim().length > 0);
      isValid = answeredLevels.length >= 5;
    } else if (type === 'ISHIKAWA') {
      // Regra: Pelo menos uma categoria preenchida e uma causa marcada como raiz
      const categories = data.categories || {};
      const hasContent = Object.values(categories).some(c => c && c.length > 0);
      const hasRootMarked = data.has_root_cause === true;
      isValid = hasContent && hasRootMarked;
    }

    return {
      decision: isValid ? 'ALLOW_PROGRESS' : 'BLOCK_WORKFLOW',
      rule_applied: 'BR-ACR-01',
      analysis_type: type,
      deterministic: true
    };
  }

  /**
   * Motor Determinístico de Validação de CAPA (BR-CAPA-01 - HARDENED)
   */
  async evaluateCAPA(documentId) {
    if (!documentId) {
      return { decision: 'INSUFFICIENT_CONTEXT' };
    }

    // 1. Filtra exclusivamente CAPAs com status PENDENTE ou CONCLUIDO (Hardening Rule)
    const capas = await CapaRepository.findActiveByDocumentId(documentId);

    // 2. Se não houver CAPAs ativas, bloqueia (BR-CAPA-01)
    if (capas.length === 0) {
      return {
        decision: 'BLOCK_WORKFLOW',
        rule_applied: 'BR-CAPA-01',
        error_code: 'CAPA_INCOMPLETE',
        deterministic: true
      };
    }

    // 3. Todas as CAPAs devem ser válidas (Unicidade e Consistência)
    for (const capa of capas) {
      const isInvalid = 
        !capa.type || 
        !capa.description || 
        !capa.root_cause_link || 
        !capa.responsible || 
        !capa.due_date || 
        !capa.efficacy_criteria;

      if (isInvalid) {
        return {
          decision: 'BLOCK_WORKFLOW',
          rule_applied: 'BR-CAPA-01',
          error_code: 'CAPA_INCOMPLETE',
          deterministic: true
        };
      }
    }

    return {
      decision: isValid ? 'ALLOW_PROGRESS' : 'BLOCK_WORKFLOW',
      rule_applied: 'BR-CAPA-01',
      deterministic: true
    };
  }

  /**
   * Motor Determinístico de Verificação de Eficácia (BR-EVE - HARDENED)
   */
  async evaluateEfficacy(documentId) {
    if (!documentId) {
      return { decision: 'INSUFFICIENT_CONTEXT' };
    }

    // A. Busca dados do RNC
    const doc = await DocumentRepository.getById(documentId);
    
    // B. Busca CAPAs ativas
    const capas = await CapaRepository.findActiveByDocumentId(documentId);
    
    // 1. Filtro de Execução: Todas devem estar CONCLUIDAS
    const allFinished = capas.length > 0 && capas.every(c => c.status === 'CONCLUIDO');
    if (!allFinished) {
      return await this._persistEfficacyDecision(documentId, 'BLOCK_WORKFLOW', ['BR-EVE-01'], 'CAPAs não concluídas ou inexistentes.');
    }

    // C. Pega data da última implementação
    const implementationDate = new Date(Math.max(...capas.map(c => new Date(c.updated_at || c.created_at))));

    // 2. Validação BR-EVE-02: Evidências Objetivas
    for (const capa of capas) {
      const evidences = await EfficacyRepository.findObjectiveEvidencesByCapaId(capa.id);
      if (evidences.length === 0) {
        return await this._persistEfficacyDecision(documentId, 'BLOCK_WORKFLOW', ['BR-EVE-02'], `CAPA ID ${capa.id} sem evidência objetiva.`);
      }
    }

    // 3. Validação BR-EVE-03: Reincidência Pós-Implementação
    const recurrence = await EfficacyRepository.findPostImplementationRecurrence(
      doc.supplier_id, 
      doc.defect_category, 
      implementationDate
    );

    if (recurrence) {
      return await this._persistEfficacyDecision(
        documentId, 
        'REABERTURA_AUTOMATICA', 
        ['BR-EVE-03'], 
        `Reincidência detectada: Documento ${recurrence.code} criado em ${recurrence.created_at}.`
      );
    }

    // 4. Decisão Positiva
    return await this._persistEfficacyDecision(documentId, 'ENCERRAMENTO_DEFINITIVO', ['BR-EVE-01', 'BR-EVE-02', 'BR-EVE-03'], 'Eficácia validada com sucesso.');
  }

  async _persistEfficacyDecision(documentId, decision, rules, summary) {
    const record = await EfficacyRepository.saveDecision({
      document_id: documentId,
      decision,
      rules_applied: rules,
      evidence_summary: summary
    });

    return {
      decision,
      rules_applied: rules,
      deterministic: true,
      audit_trail_id: record.id
    };
  }

  async changeStatus(documentId, newStatus, changedBy = 'sistema') {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Busca dados do documento
      const docResult = await client.query(
        'SELECT status, type FROM audit_quality.documents WHERE id = $1', 
        [documentId]
      );
      
      if (docResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return { error: true, status: 404, message: 'Documento não encontrado.' };
      }
      
      const { status: oldStatus, type: docType } = docResult.rows[0];

      // 2. Gatekeeper Soberano para RNC (Encerramento)
      if (newStatus === 'CONCLUIDO' && docType === 'RNC') {
        // Validação ACR
        const acrEval = await this.evaluateACR(documentId);
        if (acrEval.decision === 'BLOCK_WORKFLOW') {
          await client.query('ROLLBACK');
          return { error: true, status: 403, message: 'Bloqueio: ACR inválida.', evaluation: acrEval };
        }

        // Validação CAPA
        const capaEval = await this.evaluateCAPA(documentId);
        if (capaEval.decision === 'BLOCK_WORKFLOW') {
          await client.query('ROLLBACK');
          return { error: true, status: 403, message: 'Bloqueio: CAPA incompleta.', evaluation: capaEval };
        }

        // MOTOR DE EFICÁCIA (Soberano)
        const effEval = await this.evaluateEfficacy(documentId);
        
        if (effEval.decision === 'REABERTURA_AUTOMATICA') {
          // BR-EVE-03: Retrocede workflow
          await client.query(
            'UPDATE audit_quality.documents SET status = $1, updated_at = NOW() WHERE id = $2',
            ['EM_ANALISE', documentId]
          );
          await client.query(
            `INSERT INTO audit_quality.status_history (document_id, old_status, new_status, changed_by) 
             VALUES ($1, $2, 'EM_ANALISE', 'motor_eficacia')`,
            [documentId, oldStatus]
          );
          await client.query('COMMIT');
          return { 
            error: true, 
            status: 409, 
            message: 'REABERTURA AUTOMÁTICA: Reincidência detectada pelo motor de eficácia.', 
            evaluation: effEval 
          };
        }

        if (effEval.decision === 'BLOCK_WORKFLOW') {
          await client.query('ROLLBACK');
          return { error: true, status: 403, message: 'Bloqueio: Eficácia não comprovada.', evaluation: effEval };
        }
        
        // Se chegou aqui, a decisão é ENCERRAMENTO_DEFINITIVO
      }

      // 3. Gate de Encerramento Administrativo (Assinaturas Paralelas)
      if (newStatus === 'ENCERRADO' && docType === 'RNC') {
        const isComplete = await SignatureService.isSignOffComplete(documentId);
        if (!isComplete) {
          await client.query('ROLLBACK');
          return { 
            error: true, 
            status: 403, 
            message: 'Bloqueio: Encerramento administrativo exige a coleta de todas as assinaturas obrigatórias.' 
          };
        }
      }

      // 4. Atualiza o documento
      await client.query(
        'UPDATE audit_quality.documents SET status = $1, updated_at = NOW() WHERE id = $2',
        [newStatus, documentId]
      );

      // 4. Grava no histórico
      await client.query(
        `INSERT INTO audit_quality.status_history (document_id, old_status, new_status, changed_by) 
         VALUES ($1, $2, $3, $4)`,
        [documentId, oldStatus, newStatus, changedBy]
      );

      await client.query('COMMIT');

      // 5. Side Effect: Notificação do Fornecedor (Magic Link)
      if (newStatus === 'ENVIADO_FORNECEDOR') {
        PortalService.notifySupplier(documentId).catch(err => {
          console.error('Falha na notificação assíncrona do fornecedor:', err.message);
        });
      }

      // BUSCA O DOCUMENTO ATUALIZADO PARA DEVOLVER AO FRONTEND
      const updatedDoc = await DocumentRepository.getById(documentId);
      return { error: false, data: updatedDoc };
    } catch (err) {
      await client.query('ROLLBACK');
      return { error: true, message: err.message };
    } finally {
      client.release();
    }
  }

  async getTimeline(documentId) {
    // Busca os dados unificados (Status + E-mails) do Repositório
    const timeline = await DocumentRepository.getTimeline(documentId);
    return { data: timeline };
  }

  _handleDbError(err) {
    console.error('DB ERROR:', err.code, err.message);

    if (err.code === 'P0001') {
      return { error: true, status: 409, message: err.message };
    }
    if (err.code === '23514') {
      return { error: true, status: 422, message: 'Campos obrigatórios não informados para este tipo de documento.' };
    }
    if (err.code === '23502') {
      return { error: true, status: 422, message: 'Campo obrigatório está vazio.' };
    }
    if (err.code === '23503') {
      return { error: true, status: 400, message: 'Fornecedor inválido ou inexistente.' };
    }
    if (err.code === '23505') {
      return { error: true, status: 409, message: 'Já existe um documento com este código.' };
    }

    return { error: true, status: 500, message: 'Erro interno ao processar a solicitação.' };
  }
}

export default new DocumentService();