// Score GUT = SOMA (G + U + T)
export function calcGUT(gravity, urgency, tendency) {
  const g = Number(gravity);
  const u = Number(urgency);
  const t = Number(tendency);

  if ([g, u, t].some(v => Number.isNaN(v))) {
    return 0;
  }

  return g + u + t; // ✅ máximo = 27
}

// Classificação baseada na soma
export function gutLevel(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return { label: 'Baixo', color: 'baixo' };
  }

  if (score >= 21) return { label: 'Crítico', color: 'critico' };
  if (score >= 16) return { label: 'Alto', color: 'alto' };
  if (score >= 10) return { label: 'Médio', color: 'medio' };

  return { label: 'Baixo', color: 'baixo' };
}

// Ranking por prioridade
export function rankByGUT(documents = []) {
  return [...documents]
    .map(d => {
      const gutScore = calcGUT(
        d.gut_gravity,
        d.gut_urgency,
        d.gut_tendency
      );

      return { ...d, gutScore };
    })
    .sort((a, b) => b.gutScore - a.gutScore);
}
