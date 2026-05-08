import crypto from 'crypto';
import SignatureRepository from '../repositories/SignatureRepository.js';
import EfficacyRepository from '../repositories/EfficacyRepository.js';
import DocumentRepository from '../repositories/DocumentRepository.js';

class SignatureService {
  /**
   * Registro Formal de Assinatura (BR-SIGN-01 e BR-SIGN-IDENTITY)
   */
  async registerSignature(documentId, user, roleToSign) {
    // 1. Validação de Identidade (BR-SIGN-IDENTITY)
    if (user.role !== roleToSign) {
      throw new Error(`Inconsistência: Usuário possui papel '${user.role}' mas tentou assinar como '${roleToSign}'.`);
    }

    // 2. Precondição Soberana (BR-SIGN-01): Deve existir decisão de encerramento definitiva
    const lastDecision = await EfficacyRepository.getLastDecision(documentId);
    if (!lastDecision || lastDecision.decision !== 'ENCERRAMENTO_DEFINITIVO') {
      throw new Error('Bloqueio: Nenhuma decisão técnica de encerramento definitivo encontrada para este RNC.');
    }

    // 3. Verifica se o papel já assinou esta decisão específica
    const alreadySigned = await SignatureRepository.hasRoleSignedDecision(documentId, roleToSign, lastDecision.id);
    if (alreadySigned) {
      throw new Error(`O papel '${roleToSign}' já formalizou concordância com esta decisão técnica.`);
    }

    // 4. Geração de Hash de Integridade (SHA-256)
    const hashSource = `${documentId}-${user.id}-${roleToSign}-${lastDecision.id}-${new Date().toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(hashSource).digest('hex');

    // 5. Persistência
    return await SignatureRepository.save({
      document_id: documentId,
      user_id: user.id,
      role: roleToSign,
      decision_uuid: lastDecision.id,
      signature_hash: signatureHash
    });
  }

  /**
   * Verifica se o painel de assinaturas paralelas está completo (BR-SIGN-04)
   */
  async isSignOffComplete(documentId) {
    const doc = await DocumentRepository.getById(documentId);
    const lastDecision = await EfficacyRepository.getLastDecision(documentId);

    if (!lastDecision || lastDecision.decision !== 'ENCERRAMENTO_DEFINITIVO') return false;

    // Busca papéis configurados como obrigatórios
    const requiredRoles = await SignatureRepository.getRequiredRoles(doc.type);
    if (requiredRoles.length === 0) return true; // Sem assinaturas obrigatórias

    // Busca assinaturas realizadas para a decisão atual
    const currentSignatures = await SignatureRepository.getSignaturesByDecision(documentId, lastDecision.id);
    const signedRoles = currentSignatures.map(s => s.role);

    // Verifica se todos os obrigatórios assinaram
    return requiredRoles.every(role => signedRoles.includes(role));
  }

  async getSignatureStatus(documentId) {
    const doc = await DocumentRepository.getById(documentId);
    const lastDecision = await EfficacyRepository.getLastDecision(documentId);
    
    const requiredRoles = await SignatureRepository.getRequiredRoles(doc.type);
    const signatures = lastDecision 
      ? await SignatureRepository.getSignaturesByDecision(documentId, lastDecision.id) 
      : [];

    return {
      can_sign: lastDecision?.decision === 'ENCERRAMENTO_DEFINITIVO',
      required_roles: requiredRoles,
      current_signatures: signatures,
      is_complete: await this.isSignOffComplete(documentId)
    };
  }
}

export default new SignatureService();
