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

    const portalUrl = `${process.env.APP_URL}/portal/evidence?token=${token}`;

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
   */
  async generateLink(documentId) {
    const doc = await DocumentRepository.getById(documentId);
    if (!doc) throw new Error('Documento não encontrado');

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48h de validade

    // 1. Persistência Soberana no Banco
    const linkRecord = await PortalRepository.saveLink({
      document_id: documentId,
      supplier_id: doc.supplier_id,
      expires_at: expiresAt,
      scope: 'EVIDENCE_SUBMISSION'
    });

    // 2. JWT atua apenas como portador do token_id
    const token = jwt.sign(
      { token_id: linkRecord.token_id }, 
      process.env.JWT_SECRET || 'secret_hardened', 
      { expiresIn: '48h' }
    );

    return { token, expires_at: expiresAt };
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
      if (linkRecord.scope !== 'EVIDENCE_SUBMISSION') throw new Error('Escopo inválido');

      return linkRecord;
    } catch (err) {
      throw new Error(`Acesso negado: ${err.message}`);
    }
  }

  async getPortalData(token) {
    const linkRecord = await this.validateAccess(token);
    return await PortalRepository.getPortalViewData(linkRecord.document_id);
  }

  /**
   * Submissão de Evidência (Declaração do Fornecedor)
   */
  async submitEvidence(token, evidenceData) {
    const linkRecord = await this.validateAccess(token);
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Persiste a evidência (BR-PORTAL-04)
      // data: { capa_id, description, is_objective }
      await client.query(
        `INSERT INTO audit_quality.capa_evidences (capa_id, description, is_objective)
         VALUES ($1, $2, $3)`,
        [evidenceData.capa_id, evidenceData.description, evidenceData.is_objective === true]
      );

      // 2. Marca link como usado (Atomicidade e Uso Único)
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
}

export default new PortalService();
