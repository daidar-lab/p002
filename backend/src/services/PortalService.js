import jwt from 'jsonwebtoken';
import PortalRepository from '../repositories/PortalRepository.js';
import DocumentRepository from '../repositories/DocumentRepository.js';
import EfficacyRepository from '../repositories/EfficacyRepository.js';
import MailService from './MailService.js';
import pool from '../config/db.js';

class PortalService {
  /**
   * Notifica o fornecedor enviando o Magic Link (BR-PORTAL-SOVEREIGN)
   */
  async notifySupplier(documentId) {
    const { token, expires_at } = await this.generateLink(documentId);
    const doc = await DocumentRepository.getById(documentId);
    
    if (!doc.supplier_email) {
      throw new Error('Fornecedor sem e-mail cadastrado');
    }

    const portalUrl = `${process.env.FRONTEND_URL}/portal/${token}`;

    const subject = `Ação Requerida: Submissão de Evidência — ${doc.code}`;
    const text = `Olá ${doc.contact_name || 'Fornecedor'},\n\nO documento ${doc.code} (${doc.defect_category}) exige a submissão de evidências objetivas para as CAPAs acordadas.\n\nAcesse o link seguro abaixo para enviar as evidências:\n\n${portalUrl}\n\nEste link é de uso único e expira em ${new Date(expires_at).toLocaleString('pt-BR')}.\n\nAtenciosamente,\nEquipe de Qualidade Cidade Imperial`;

    return await MailService.send({
      to: doc.supplier_email,
      subject,
      text,
      document_id: documentId,
      triggered_by: 'sistema'
    });
  }
  /**
   * Gera um Magic Link soberano (Banco > JWT)
   * Suporta document_id ou rvt_id
   */
  async createMagicLink({ document_id, rvt_id, supplier_id, scope, expires_at }, client = null) {
    const expiresAt = expires_at || new Date(Date.now() + 48 * 60 * 60 * 1000);

    // 1. Persistência Soberana no Banco
    const linkRecord = await PortalRepository.saveLink({
      document_id,
      rvt_id,
      supplier_id,
      expires_at: expiresAt,
      scope
    }, client);

    // 2. JWT atua apenas como portador do token_id
    const token = jwt.sign(
      { token_id: linkRecord.token_id }, 
      process.env.JWT_SECRET || 'secret_hardened', 
      { expiresIn: '7d' } // Aumentado para 7 dias para evitar expiração prematura no dev
    );

    return { token, token_id: linkRecord.token_id, expires_at: expiresAt };
  }

  async generateLink(documentId) {
    const doc = await DocumentRepository.getById(documentId);
    if (!doc) throw new Error('Documento não encontrado');

    return await this.createMagicLink({
      document_id: documentId,
      supplier_id: doc.supplier_id,
      scope: 'EVIDENCE_SUBMISSION'
    });
  }

  /**
   * Valida acesso com Soberania do Banco
   */
  async validateAccess(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_hardened');
      const linkRecord = await PortalRepository.findByTokenId(decoded.token_id);

      if (!linkRecord) throw new Error('Link inválido');
      if (linkRecord.used_at) throw new Error('Link já utilizado');
      if (new Date() > new Date(linkRecord.expires_at)) throw new Error('Link expirado');
      
      const validScopes = ['EVIDENCE_SUBMISSION', 'RVT_SCHEDULING', 'RVT_SIGNATURE'];
      if (!validScopes.includes(linkRecord.scope)) throw new Error('Escopo inválido');

      return linkRecord;
    } catch (err) {
      console.error(`[PORTAL ERROR] Falha na validação do token: ${err.message}`);
      throw new Error(`Acesso negado: ${err.message}`);
    }
  }

  async getPortalData(token) {
    const linkRecord = await this.validateAccess(token);
    
    if (linkRecord.scope === 'EVIDENCE_SUBMISSION') {
      return await PortalRepository.getPortalViewData(linkRecord.document_id);
    }
    
    if (linkRecord.scope === 'RVT_SCHEDULING' || linkRecord.scope === 'RVT_SIGNATURE') {
      return await PortalRepository.getPortalRvtData(linkRecord.rvt_id);
    }

    throw new Error('Tipo de acesso não suportado');
  }

  async selectRvtDate(token, selectedDate) {
    const linkRecord = await this.validateAccess(token);
    if (linkRecord.scope !== 'RVT_SCHEDULING') throw new Error('Operação inválida');

    const rvt = await PortalRepository.getPortalRvtData(linkRecord.rvt_id);
    const date = new Date(selectedDate);
    
    if (date < new Date(rvt.window_start) || date > new Date(rvt.window_end)) {
      throw new Error('Data fora da janela permitida');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      await client.query(
        "UPDATE audit_quality.rvts SET scheduled_date = $1, visit_date = $1, status = 'AGUARDANDO_EXECUCAO' WHERE id = $2",
        [selectedDate, linkRecord.rvt_id]
      );

      await PortalRepository.markAsUsed(linkRecord.token_id);
      
      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async signRvt(token, signerName) {
    const linkRecord = await this.validateAccess(token);
    if (linkRecord.scope !== 'RVT_SIGNATURE') throw new Error('Operação inválida');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const RvtRepository = (await import('../repositories/RvtRepository.js')).default;
      
      // Assina como Representante Técnico
      await RvtRepository.upsertSignature({
        rvt_id: linkRecord.rvt_id,
        role: 'Representante Técnico',
        signer_name: signerName,
        status: 'SIGNED',
        signed_at: new Date(),
        signature_hash: `SHA256:${Math.random().toString(36).substring(7)}` // Simulado
      }, client);

      const RvtService = (await import('./RvtService.js')).default;
      await RvtService._checkCompletion(linkRecord.rvt_id, client);

      await PortalRepository.markAsUsed(linkRecord.token_id);

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Submissão de Evidência (Declaração do Fornecedor)
   */
  async submitEvidence(token, evidenceData) {
    const linkRecord = await this.validateAccess(token);
    const client = await pool.connect();
    const doc = await DocumentRepository.getById(linkRecord.document_id);

    try {
      await client.query('BEGIN');

      // 1. Registra a Causa Raiz (Identificada pelo Fornecedor)
      const acrType = evidenceData.acr_type || '5_WHYS';
      const acrData = { 
        ...evidenceData.acr_data, 
        identified_by: 'fornecedor', 
        source: 'portal',
        has_root_cause: !!evidenceData.root_cause
      };

      const rcRes = await client.query(
        `INSERT INTO audit_quality.root_cause_analyses (document_id, type, root_cause, data)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [linkRecord.document_id, acrType, evidenceData.root_cause, JSON.stringify(acrData)]
      );

      const acrId = rcRes.rows[0].id;

      // 2. Cria a CAPA correspondente (Preenchendo campos NOT NULL)
      // due_date: +30 dias padrão / criteria: auto / responsible: fornecedor
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      const typeMapping = {
        'CORRETIVA': 'CORRECTIVE',
        'PREVENTIVA': 'PREVENTIVE',
        'PREDITIVA': 'PREDICTIVE'
      };

      const dbType = typeMapping[evidenceData.capa_type] || 'CORRECTIVE';

      const capaRes = await client.query(
        `INSERT INTO audit_quality.capas (
          document_id, type, description, status, 
          due_date, efficacy_criteria, responsible, root_cause_link
         )
         VALUES ($1, $2, $3, 'IMPLEMENTADO', $4, $5, $6, $7)
         RETURNING id`,
        [
          linkRecord.document_id, 
          dbType, 
          evidenceData.capa_description,
          dueDate,
          'Verificação de não reincidência em 90 dias',
          doc.supplier_name || 'Fornecedor',
          acrId.toString()
        ]
      );

      // 3. Persiste a evidência (com suporte a foto na descrição se houver)
      const fullEvidenceDesc = evidenceData.photo_url 
        ? `${evidenceData.evidence_description}\n\n[EVIDÊNCIA VISUAL]: ${evidenceData.photo_url}`
        : evidenceData.evidence_description;

      await client.query(
        `INSERT INTO audit_quality.capa_evidences (capa_id, description, is_objective)
         VALUES ($1, $2, $3)`,
        [capaRes.rows[0].id, fullEvidenceDesc, evidenceData.is_objective === true]
      );

      // 4. Marca link como usado
      await PortalRepository.markAsUsed(linkRecord.token_id);

      // 5. Avança o status do documento
      await client.query(
        `UPDATE audit_quality.documents SET status = 'AGUARDANDO_DISPOSICAO', updated_at = NOW() WHERE id = $1`,
        [linkRecord.document_id]
      );

      await client.query('COMMIT');
      return { success: true };
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[PORTAL SUBMISSION ERROR]', err);
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new PortalService();
