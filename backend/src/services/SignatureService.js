import crypto from 'crypto';
import SignatureRepository from '../repositories/SignatureRepository.js';
import DocumentRepository from '../repositories/DocumentRepository.js';

class SignatureService {
  REQUIRED_ROLES = ['QUALITY_ANALYST', 'QUALITY_COORDINATOR', 'CGI', 'LOGISTICS', 'PCP'];

  constructor() {
    // HIR-04: SLA evaluation MUST be scheduled, never user-triggered
    // Iniciando monitor de SLA a cada 1 minuto
    setInterval(() => this.checkSLAEngine(), 60000);
  }

  /**
   * Parallel Dispatch (STEP 2/3)
   */
  async dispatchParallel(documentId) {
    const doc = await DocumentRepository.getById(documentId);
    if (!doc) throw new Error('Documento não encontrado');
    if (doc.type !== 'RNC') return; // IR-07: Signature workflow mandatory for RNC only

    // VR-01/VR-02: SLA Determination
    const slaHours = doc.severity === 'CRITICAL' ? 8 : 24;
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + slaHours);

    await SignatureRepository.dispatchParallel(documentId, this.REQUIRED_ROLES, deadline.toISOString());
    console.log(`[BR-07] Despacho paralelo concluído para RNC ${documentId}. SLA: ${slaHours}h`);
  }

  /**
   * Signature Logic with Status Gate (HVR-07)
   */
  async sign(documentId, role, userId) {
    const doc = await DocumentRepository.getById(documentId);
    
    // HVR-07: Signature writes MUST fail if NC_STATUS ≠ AWAITING_SIGNATURES
    if (doc.status !== 'AGUARDANDO_ASSINATURAS') {
      throw new Error('HFC-07: Escrita de assinatura bloqueada. Status atual não permite assinaturas.');
    }

    const signatures = await SignatureRepository.getByDocumentId(documentId);
    const sig = signatures.find(s => s.role === role);

    if (!sig) throw new Error('Papel de assinatura não solicitado para este documento');
    if (sig.status === 'SIGNED') throw new Error('HFC-03: Assinatura já realizada e imutável.');

    // State Hashing
    const stateHash = this.calculateStateHash(documentId, role, userId);

    return await SignatureRepository.updateToSigned(sig.id, userId, stateHash);
  }

  /**
   * Cryptographic State Hash (Output Contract)
   */
  calculateStateHash(documentId, role, userId) {
    const source = `${documentId}-${role}-${userId}-${new Date().toISOString()}`;
    return crypto.createHash('sha256').update(source).digest('hex');
  }

  /**
   * Internal SLA Engine (HIR-04)
   * Mark as ESCALATED if deadline exceeded
   */
  async checkSLAEngine() {
    try {
      const expired = await SignatureRepository.getExpiredSignatures();
      for (const sig of expired) {
        const now = new Date();
        const deadline = new Date(sig.sla_deadline);
        const duration = deadline.getTime() - new Date(sig.requested_at).getTime();
        
        // VR-04: Escalation L2 after 2x SLA
        const level = (now.getTime() > (deadline.getTime() + duration)) ? 'EXECUTIVE' : 'MANAGERIAL';
        
        await SignatureRepository.updateEscalation(sig.id, level);
        console.log(`[SLA ALERT] Assinatura ${sig.id} (Role: ${sig.role}) escalonada para ${level}`);
      }
    } catch (err) {
      console.error('[SLA ENGINE ERROR]', err.message);
    }
  }

  /**
   * Atomic Revalidation for Closure (HVR-06)
   */
  async canProceedToDisposition(documentId) {
    const signatures = await SignatureRepository.getByDocumentId(documentId);
    if (signatures.length === 0) return false;
    
    // HFC-02: Block if any signature is not SIGNED
    return signatures.every(s => s.status === 'SIGNED');
  }

  async getHardenedState(documentId) {
    const doc = await DocumentRepository.getById(documentId);
    const signatures = await SignatureRepository.getByDocumentId(documentId);
    
    // Constrói o Output Contract conforme a SPEC
    return {
      ncId: documentId,
      severity: doc.severity,
      signatures: signatures.map(s => ({
        role: s.role,
        status: s.status,
        requestedAt: s.requested_at,
        slaDeadline: s.sla_deadline,
        signedAt: s.signed_at,
        escalationLevel: s.escalation_level
      })),
      closureAllowed: await this.canProceedToDisposition(documentId)
    };
  }
}

export default new SignatureService();
