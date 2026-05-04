export const mockSuppliers = [
  { id: 1, name: 'Metalúrgica Souza Ltda', cnpj: '12.345.678/0001-99', contact: 'Carlos Souza', email: 'carlos@souza.com', active: true },
  { id: 2, name: 'Plásticos Norte S.A.', cnpj: '98.765.432/0001-11', contact: 'Ana Lima', email: 'ana@plasticosnorte.com', active: true },
  { id: 3, name: 'Têxtil Horizonte ME', cnpj: '55.111.222/0001-33', contact: 'Bruno Reis', email: 'bruno@textilhorizonte.com', active: false },
  { id: 4, name: 'Embalagens FastPack', cnpj: '77.888.999/0001-44', contact: 'Fernanda Dias', email: 'fernanda@fastpack.com', active: true },
];

export const mockDocuments = [
  { id: 1, code: 'RNC-2024-001', type: 'RNC', supplier_id: 1, supplier_name: 'Metalúrgica Souza Ltda', item_description: 'Parafuso M8 fora de tolerância dimensional', defect_category: 'QUALIDADE', status: 'ABERTO', created_at: '2024-11-03', gravity: 8, urgency: 7, tendency: 6 },
  { id: 2, code: 'RAQ-2024-002', type: 'RAQ', supplier_id: 2, supplier_name: 'Plásticos Norte S.A.', item_description: 'Avaliação periódica Q3 2024', defect_category: 'PROCESSO', status: 'EM_ANALISE', created_at: '2024-11-10', gravity: 5, urgency: 5, tendency: 4 },
  { id: 3, code: 'RHE-2024-003', type: 'RHE', supplier_id: 3, supplier_name: 'Têxtil Horizonte ME', item_description: 'Homologação tecido 400g/m²', defect_category: 'QUALIDADE', status: 'CONCLUIDO', created_at: '2024-10-22', gravity: 3, urgency: 2, tendency: 2 },
  { id: 4, code: 'RNC-2024-004', type: 'RNC', supplier_id: 4, supplier_name: 'Embalagens FastPack', item_description: 'Caixa de papelão abaixo da resistência mínima', defect_category: 'MATERIAL', status: 'ABERTO', created_at: '2024-11-18', gravity: 9, urgency: 8, tendency: 7 },
  { id: 5, code: 'RNC-2024-005', type: 'RNC', supplier_id: 1, supplier_name: 'Metalúrgica Souza Ltda', item_description: 'Solda com porosidade excessiva lote #447', defect_category: 'PROCESSO', status: 'EM_ANALISE', created_at: '2024-11-20', gravity: 7, urgency: 9, tendency: 8 },
  { id: 6, code: 'RAQ-2024-006', type: 'RAQ', supplier_id: 2, supplier_name: 'Plásticos Norte S.A.', item_description: 'Reauditoria pós-ação corretiva Q2', defect_category: 'QUALIDADE', status: 'CONCLUIDO', created_at: '2024-10-05', gravity: 4, urgency: 3, tendency: 3 },
];

export const mockTimeline = [
  { id: 1, doc_id: 4, date: '2024-11-18', user: 'J. Ferreira', action: 'Documento criado', detail: 'RNC aberta após inspeção de recebimento lote #882' },
  { id: 2, doc_id: 4, date: '2024-11-19', user: 'M. Santos', action: 'Enviado ao fornecedor', detail: 'Notificação formal enviada para Embalagens FastPack' },
  { id: 3, doc_id: 4, date: '2024-11-21', user: 'J. Ferreira', action: 'Score GUT calculado', detail: 'G=9 U=8 T=7 → Score 504 — Prioridade crítica' },
];
