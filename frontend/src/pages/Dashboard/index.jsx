import React, { useState, useEffect } from 'react';
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
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/snapshots/latest`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
    })
    .then(res => res.ok ? res.json() : Promise.reject('Sem snapshots auditados'))
    .then(data => setSnapshot(data))
    .catch(err => setError(err))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><p className="loading-text">Carregando auditoria...</p></div>;

  if (!snapshot) {
    return (
      <div className="page">
        <div className="audit-lockout" style={{ textAlign: 'center', marginTop: '100px', padding: '40px', background: '#fff', borderRadius: '12px', border: '2px dashed #cbd5e1' }}>
          <span style={{ fontSize: '48px' }}></span>
          <h2 style={{ marginTop: '20px', color: '#1e293b' }}>Aguardando Auditoria de Período</h2>
          <p style={{ color: '#64748b', maxWidth: '400px', margin: '10px auto' }}>
            Este dashboard está configurado para o modo <b>Missão Crítica</b>. 
            Nenhum dado vivo é exibido sem o carimbo de auditoria oficial.
          </p>
        </div>
      </div>
    );
  }

  const { metrics } = snapshot;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral do sistema</p>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <KpiCard label="Total Auditado" value={metrics.total} />
        <KpiCard label="Críticos" value={metrics.bySeverity.CRITICAL || 0} accent="danger" />
        <KpiCard label="Alto Impacto" value={metrics.bySeverity.HIGH || 0} accent="warning" />
        <KpiCard label="Lead Time Médio" value={`${metrics.performance.avgLeadTimeDays} dias`} accent="success" />
      </div>

      <div className="dash-grid">
        {/* Distribuição por tipo */}
        <div className="card dash-card">
          <h2 className="card-section-title">Distribuição por tipo</h2>
          <div className="dash-type-list">
            {['RNC', 'RAQ', 'RHE'].map(type => {
              const count = metrics.byType[type] || 0;
              const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
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
              { label: 'Aberto', status: 'ABERTO' },
              { label: 'Em análise', status: 'EM_ANALISE' },
              { label: 'Env. Fornecedor', status: 'ENVIADO_FORNECEDOR' },
              { label: 'Concluído', status: 'CONCLUIDO' },
              { label: 'Cancelado', status: 'CANCELADO' },
            ].map(({ label, status }) => (
              <div key={status} className="dash-status-row">
                <StatusBadge status={status} />
                <span className="dash-status-count">{metrics.byStatus[status] || 0}</span>
              </div>
            ))}
          </div>
        </div>


      </div>
    </div>
  );
}
