import React, { useState } from 'react';
import { useDocumentos } from '../../hooks/useData.js';
import { TypeBadge } from '../../components/Badge.jsx';
import { rankByGUT, gutLevel } from '../../utils/gut.js';

function GUTBar({ score }) {
  const pct = Math.round((score / 729) * 100);
  const { color } = gutLevel(score);
  return (
    <div className="gut-bar-wrap">
      <div className="gut-bar">
        <div className={`gut-bar__fill gut-bar__fill--${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="gut-bar__score">{score}</span>
    </div>
  );
}

export default function Priorizacao() {
  const { documents, loading } = useDocumentos();
  const [filterType, setFilterType]   = useState('');
  const [filterLevel, setFilterLevel] = useState('');

  const ranked   = rankByGUT(documents);
  const criticos = ranked.filter(d => gutLevel(d.gutScore).color === 'critico').length;
  const altos    = ranked.filter(d => gutLevel(d.gutScore).color === 'alto').length;

  const filtered = ranked.filter(d => {
    if (filterType  && d.type !== filterType) return false;
    if (filterLevel && gutLevel(d.gutScore).color !== filterLevel) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Priorização — Matriz GUT</h1>
          <p className="page-subtitle">Ranking automático por Gravidade × Urgência × Tendência</p>
        </div>
      </div>

      <div className="kpi-row">
        <div className="kpi-card"><span className="kpi-label">Total analisado</span><span className="kpi-value">{ranked.length}</span></div>
        <div className="kpi-card kpi-card--danger"><span className="kpi-label">Críticos</span><span className="kpi-value">{criticos}</span></div>
        <div className="kpi-card kpi-card--warning"><span className="kpi-label">Alta prioridade</span><span className="kpi-value">{altos}</span></div>
        <div className="kpi-card"><span className="kpi-label">Score máximo</span><span className="kpi-value kpi-value--sub">729</span></div>
      </div>

      <div className="gut-legend">
        {[['critico','Crítico ≥ 300'],['alto','Alto ≥ 100'],['medio','Médio ≥ 27'],['baixo','Baixo < 27']].map(([c,l])=>(
          <span key={c} className="gut-legend__item"><span className={`gut-dot gut-dot--${c}`}/>{l}</span>
        ))}
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
              <tr><th>#</th><th>Código</th><th>Tipo</th><th>Fornecedor</th>
                <th title="Gravidade">G</th><th title="Urgência">U</th><th title="Tendência">T</th>
                <th>Score GUT</th><th>Nível</th></tr>
            </thead>
            <tbody>
              {filtered.map((d, i) => {
                const { label, color } = gutLevel(d.gutScore);
                return (
                  <tr key={d.id} className={color === 'critico' ? 'row--critico' : ''}>
                    <td className="td-rank text-sub">{i + 1}º</td>
                    <td className="mono">{d.code}</td>
                    <td><TypeBadge type={d.type} /></td>
                    <td>{d.supplier_name || '—'}</td>
                    <td className="td-score">{d.gut_gravity}</td>
                    <td className="td-score">{d.gut_urgency}</td>
                    <td className="td-score">{d.gut_tendency}</td>
                    <td className="td-gut-bar"><GUTBar score={d.gutScore} /></td>
                    <td><span className={`badge badge--gut-${color}`}>{label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
