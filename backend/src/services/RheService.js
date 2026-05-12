import RheRepository from '../repositories/RheRepository.js';

const CHECKLIST_TEMPLATES = {
  INITIAL: ['DOC_VALIDATION', 'TECH_SAMPLES', 'INITIAL_AUDIT'],
  FINAL: ['STABILITY_TEST', 'PERFORMANCE_RUN', 'FINAL_DECISION']
};

class RheService {
  /**
   * BR-01: Criação de RHE (Fase Inicial ou Final)
   */
  async createRhe(data, userId) {
    if (data.phase === 'FINAL') {
      if (!data.related_initial_rhe_id) {
        throw new Error('Invariante BR-02: RHE_FINAL exige um RHE_INICIAL aprovado.');
      }
      
      const initialRhe = await RheRepository.getById(data.related_initial_rhe_id);
      if (!initialRhe || initialRhe.status !== 'INITIAL_APPROVED') {
        throw new Error('Fail Condition: RHE_INICIAL deve estar aprovado para iniciar a fase final.');
      }

      // Invariante BR-03: Objeto deve ser idêntico
      if (initialRhe.supplier_id !== data.supplier_id || initialRhe.object_type !== data.object_type) {
        throw new Error('Fail Condition: O objeto homologado deve ser imutável entre fases.');
      }
    }

    const rhe = await RheRepository.create({
      ...data,
      created_by: userId
    });

    return rhe;
  }

  /**
   * BR-05: Validação de Checklist e Execução de Gate
   */
  async executeGate(rheId, userId, decision) {
    const rhe = await RheRepository.getById(rheId);
    if (!rhe) throw new Error('RHE não encontrado.');

    if (['INITIAL_APPROVED', 'FINAL_APPROVED', 'REPROVED'].includes(rhe.status)) {
      throw new Error('Fail Condition: Gate já executado para este status.');
    }

    const checklist = await RheRepository.getChecklist(rheId);
    const requiredItems = CHECKLIST_TEMPLATES[rhe.phase];

    // Validação de Completude (Rule 4.2) continua obrigatória
    const isComplete = requiredItems.every(reqId => 
      checklist.some(item => item.item_id === reqId && item.approved !== null)
    );

    if (!isComplete || checklist.length < requiredItems.length) {
      throw new Error('Fail Condition: Checklist incompleto bloqueia o gate.');
    }

    // Decisão baseada na escolha do usuário (Manual Override)
    let nextStatus = '';
    if (decision === 'APPROVE') {
      nextStatus = rhe.phase === 'INITIAL' ? 'INITIAL_APPROVED' : 'FINAL_APPROVED';
    } else {
      nextStatus = 'REPROVED';
    }

    return await RheRepository.updateStatus(rheId, nextStatus, userId);
  }

  async saveChecklist(rheId, items) {
    const rhe = await RheRepository.getById(rheId);
    if (['INITIAL_APPROVED', 'FINAL_APPROVED'].includes(rhe.status)) {
      throw new Error('Invariante BR-09: RHE aprovado é imutável.');
    }
    
    // Validar se os itens pertencem ao template da fase
    const allowedItems = CHECKLIST_TEMPLATES[rhe.phase];
    const filteredItems = items.filter(i => allowedItems.includes(i.item_id));

    return await RheRepository.saveChecklist(rheId, filteredItems);
  }

  async getRheDetail(rheId) {
    const rhe = await RheRepository.getById(rheId);
    const checklist = await RheRepository.getChecklist(rheId);
    return { ...rhe, checklist };
  }

  async listRhes(filters = {}) {
    return await RheRepository.list(filters);
  }
}

export default new RheService();
