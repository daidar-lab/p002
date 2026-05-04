export function calcGUT(gravity, urgency, tendency) {
  return gravity * urgency * tendency;
}

export function gutLevel(score) {
  if (score >= 300) return { label: 'Crítico', color: 'critico' };
  if (score >= 100) return { label: 'Alto', color: 'alto' };
  if (score >= 27)  return { label: 'Médio', color: 'medio' };
  return { label: 'Baixo', color: 'baixo' };
}

export function rankByGUT(documents) {
  return [...documents]
    .map(d => ({ ...d, gutScore: calcGUT(d.gravity, d.urgency, d.tendency) }))
    .sort((a, b) => b.gutScore - a.gutScore);
}
