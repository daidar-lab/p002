import React from 'react';

const TYPE_COLORS = {
  RNC: 'badge--rnc',
  RAQ: 'badge--raq',
  RHE: 'badge--rhe',
};

const STATUS_COLORS = {
  ABERTO:     'badge--aberto',
  EM_ANALISE: 'badge--analise',
  CONCLUIDO:  'badge--concluido',
  AGUARDANDO_ASSINATURAS: 'badge--assinaturas',
  AGUARDANDO_DISPOSICAO: 'badge--disposicao',
  ENVIADO_FORNECEDOR: 'badge--enviado',
  CANCELADO:  'badge--cancelado',
  // RVT Statuses
  PENDENTE: 'badge--enviado',
  AGUARDANDO_EXECUCAO: 'badge--disposicao',
  EM_VISITA: 'badge--analise',
  FINALIZADA: 'badge--assinaturas',
  ASSINADA: 'badge--concluido',
};

const STATUS_LABELS = {
  ABERTO:     'Aberto',
  EM_ANALISE: 'Em Análise',
  CONCLUIDO:  'Concluído',
  AGUARDANDO_ASSINATURAS: 'Aguardando Assinaturas',
  AGUARDANDO_DISPOSICAO: 'Aguardando Disposição',
  ENVIADO_FORNECEDOR: 'Enviado ao Fornecedor',
  CANCELADO:  'Cancelado',
  // RVT Labels
  PENDENTE: 'Aguardando Agendamento',
  AGUARDANDO_EXECUCAO: 'Aguardando Execução',
  EM_VISITA: 'Em Visita',
  FINALIZADA: 'Finalizada (Aguardando Assinaturas)',
  ASSINADA: 'Assinada',
};

export function TypeBadge({ type }) {
  return (
    <span className={`badge ${TYPE_COLORS[type] || ''}`}>{type}</span>
  );
}

export function StatusBadge({ status }) {
  return (
    <span className={`badge ${STATUS_COLORS[status] || ''}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export function ActiveBadge({ active }) {
  return (
    <span className={`badge ${active ? 'badge--concluido' : 'badge--cancelado'}`}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}
