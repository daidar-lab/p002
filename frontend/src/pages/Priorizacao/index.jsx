import React, { useState } from 'react';
import { useDocumentos } from '../../hooks/useData.js';
import { TypeBadge } from '../../components/Badge.jsx';
import { rankByGUT, gutLevel } from '../../utils/gut.js';

function GUTBar({ score }) {
  const max = 729; // 9×9×9
  const pct = Math.round((score / max) * 100);
  const level = gutLevel(score);
  return (
    <div className="gut-bar-wrap">
      <div className="gut-bar">
        <div className={`gut-bar__fill gut-bar__fill--${level.color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="gut-bar__score">{score}</span>
    </div>
  );
}

function GUTBadge({ score }) {
  const { label, color } = gutLevel(score);
  return <span className={`badge badge--gut-${color}`}>{label}</span>;
}

export default function Priorizacao() {
  const { documents, loading } = useDocumentos();
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const ranked = rankByGUT(documents);

  const filtered = ranked.filter(d => {
    if (filterType && d.type !== filterType) return false;
    if (filterLevel) {
      const { color } = gutLevel(d.gutScore);
      if (color !== filterLevel) return false;
    }
    return true;
  });

  const criticos = ranked.filter(d => gutLevel(d.gutScore).color === 'critico').length;
  const altos    = ranked.filter(d => gutLevel(d.gutScore).color === 'alto').length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Priorização — Matriz GUT</h1>
          <p className="page-subtitle">Ranking automático por Gravidade × Urgência × Tendência</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card">
          <span className="kpi-label">Total analisado</span>
          <span className="kpi-value">{ranked.length}</span>
        </div>
        <div className="kpi-card kpi-card--danger">
          <span className="kpi-label">Críticos</span>
          <span className="kpi-value">{criticos}</span>
        </div>
        <div className="kpi-card kpi-card--warning">
          <span className="kpi-label">Alta prioridade</span>
          <span className="kpi-value">{altos}</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-label">Score máximo possível</span>
          <span className="kpi-value kpi-value--sub">729</span>
        </div>
      </div>

      <div className="gut-legend">
        <span className="gut-legend__item"><span className="gut-dot gut-dot--critico"/>Crítico ≥ 300</span>
        <span className="gut-legend__item"><span className="gut-dot gut-dot--alto"/>Alto ≥ 100</span>
        <span className="gut-legend__item"><span className="gut-dot gut-dot--medio"/>Médio ≥ 27</span>
        <span className="gut-legend__item"><span className="gut-dot gut-dot--baixo"/>Baixo &lt; 27</span>
      </div>

      <div className="filters">
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option>RNC</option><option>RAQ</option><option>RHE</option>
        </select>
        <select className="filter-select" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
          <option value="">Todos os níveis</option>
          <option value="critico">Crítico</option>
          <option value="alto">Alto</option>
          <option value="medio">Médio</option>
          <option value="baixo">Baixo</option>
        </select>
      </div>

      <div className="card table-card">
        {loading ? <p className="loading-text">Calculando...</p> : (
          <table>
            <thead>
              <tr>
                <th>#</th><th>Código</th><th>Tipo</th><th>Fornecedor</th>
                <th title="Gravidade (1–9)">G</th>
                <th title="Urgência (1–9)">U</th>
                <th title="Tendência (1–9)">T</th>
                <th>Score GUT</th>
                <th>Nível</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => (
                <tr key={d.id} className={gutLevel(d.gutScore).color === 'critico' ? 'row--critico' : ''}>
                  <td className="td-rank text-sub">{i + 1}º</td>
                  <td className="mono">{d.code}</td>
                  <td><TypeBadge type={d.type} /></td>
                  <td>{d.supplier_name}</td>
                  <td className="td-score">{d.gravity}</td>
                  <td className="td-score">{d.urgency}</td>
                  <td className="td-score">{d.tendency}</td>
                  <td className="td-gut-bar"><GUTBar score={d.gutScore} /></td>
                  <td><GUTBadge score={d.gutScore} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <p className="gut-note">
        Os scores G, U e T são editáveis na aba Documentos → campo auditoria. Valores de 1 a 9 conforme metodologia GUT clássica.
      </p>
    </div>
  );
}
