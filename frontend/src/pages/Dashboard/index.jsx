import React from 'react';
import { useDocumentos } from '../../hooks/useData.js';
import { gutLevel, calcGUT } from '../../utils/gut.js';
import { TypeBadge, StatusBadge } from '../../components/Badge.jsx';

function KpiCard({ label, value, sub, accent }) {
  return (
    <div className={`kpi-card ${accent ? `kpi-card--${accent}` : ''}`}>
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  );
}

export default function Dashboard() {
  const { documents, loading } = useDocumentos();

  if (loading) return <div className="page"><p className="loading-text">Carregando dashboard...</p></div>;

  const total      = documents.length;
  const abertos    = documents.filter(d => d.status === 'ABERTO').length;
  const emAnalise  = documents.filter(d => d.status === 'EM_ANALISE').length;
  const concluidos = documents.filter(d => d.status === 'CONCLUIDO').length;

  const withScore  = documents.map(d => ({
    ...d,
    gutScore: calcGUT(d.gut_gravity, d.gut_urgency, d.gut_tendency),
  }));
  const criticos = withScore.filter(d => gutLevel(d.gutScore).color === 'critico').length;
  const top5     = [...withScore].sort((a, b) => b.gutScore - a.gutScore).slice(0, 5);

  const byType = ['RNC', 'RAQ', 'RHE'].map(t => ({
    type: t,
    count: documents.filter(d => d.type === t).length,
  }));

  const recent = [...documents]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do sistema</p>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <KpiCard label="Total de documentos" value={total} />
        <KpiCard label="Abertos" value={abertos} accent="warning" />
        <KpiCard label="Em análise" value={emAnalise} accent="info" />
        <KpiCard label="Concluídos" value={concluidos} accent="success" />
        <KpiCard label="Críticos (GUT)" value={criticos} accent="danger" sub="Score ≥ 21" />
      </div>

      <div className="dash-grid">
        {/* Distribuição por tipo */}
        <div className="card dash-card">
          <h2 className="card-section-title">Distribuição por tipo</h2>
          <div className="dash-type-list">
            {byType.map(({ type, count }) => {
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={type} className="dash-type-row">
                  <TypeBadge type={type} />
                  <div className="dash-type-bar">
                    <div className={`dash-type-fill dash-type-fill--${type.toLowerCase()}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="dash-type-count">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status overview */}
        <div className="card dash-card">
          <h2 className="card-section-title">Status dos documentos</h2>
          <div className="dash-status-list">
            {[
              { label: 'Aberto',           status: 'ABERTO',             count: abertos },
              { label: 'Em análise',       status: 'EM_ANALISE',         count: emAnalise },
              { label: 'Env. Fornecedor',  status: 'ENVIADO_FORNECEDOR', count: documents.filter(d => d.status === 'ENVIADO_FORNECEDOR').length },
              { label: 'Concluído',        status: 'CONCLUIDO',          count: concluidos },
              { label: 'Cancelado',        status: 'CANCELADO',          count: documents.filter(d => d.status === 'CANCELADO').length },
            ].map(({ label, status, count }) => (
              <div key={status} className="dash-status-row">
                <StatusBadge status={status} />
                <span className="dash-status-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 GUT */}
        <div className="card dash-card dash-card--wide">
          <h2 className="card-section-title">Top 5 — Maior score GUT</h2>
          {top5.length === 0 ? (
            <p className="text-sub" style={{ fontSize: 13 }}>Nenhum documento cadastrado.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Código</th><th>Tipo</th><th>Fornecedor</th><th>Score GUT</th><th>Nível</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((d, i) => {
                  const { label, color } = gutLevel(d.gutScore);
                  return (
                    <tr key={d.id}>
                      <td className="td-rank text-sub">{i + 1}º</td>
                      <td className="mono">{d.code}</td>
                      <td><TypeBadge type={d.type} /></td>
                      <td>{d.supplier_name || '—'}</td>
                      <td className="td-score">{d.gutScore}</td>
                      <td><span className={`badge badge--gut-${color}`}>{label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Recentes */}
        <div className="card dash-card dash-card--wide">
          <h2 className="card-section-title">Documentos recentes</h2>
          {recent.length === 0 ? (
            <p className="text-sub" style={{ fontSize: 13 }}>Nenhum documento cadastrado.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Código</th><th>Tipo</th><th>Fornecedor</th><th>Status</th><th>Data</th></tr>
              </thead>
              <tbody>
                {recent.map(d => (
                  <tr key={d.id}>
                    <td className="mono">{d.code}</td>
                    <td><TypeBadge type={d.type} /></td>
                    <td>{d.supplier_name || '—'}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="text-sub">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
