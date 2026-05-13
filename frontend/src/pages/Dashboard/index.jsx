import React, { useState, useEffect, useCallback } from 'react';
import { TypeBadge, StatusBadge } from '../../components/Badge.jsx';
import { useFornecedores } from '../../hooks/useData.js';

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
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros Globais
  const [filters, setFilters] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
    supplier_id: ''
  });

  const { suppliers } = useFornecedores();

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const res = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/stats?${query}`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
      });

      if (!res.ok) throw new Error('Falha ao carregar indicadores');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleFilterChange = (field) => (e) => {
    setFilters(prev => ({ ...prev, [field]: e.target.value }));
  };

  if (error) return <div className="page"><p className="error-banner">⚠ {error}</p></div>;

  const volumeTotal = stats?.volume.reduce((acc, v) => acc + parseInt(v.count), 0) || 0;
  const slaDentro = stats?.slaPerformance.find(s => s.sla_status === 'DENTRO')?.count || 0;
  const slaFora = stats?.slaPerformance.find(s => s.sla_status === 'FORA')?.count || 0;
  const slaPct = (slaDentro + slaFora) > 0 ? Math.round((slaDentro / (parseInt(slaDentro) + parseInt(slaFora))) * 100) : 100;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Dinâmico</h1>
          <p className="page-subtitle">Indicadores em tempo real (Live Query)</p>
        </div>

        {/* Barra de Filtros */}
        <div className="filter-bar" style={{ display: 'flex', gap: '1rem', background: '#fff', padding: '0.75rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <input type="date" className="form-input" value={filters.start} onChange={handleFilterChange('start')} style={{ width: 'auto' }} />
          <input type="date" className="form-input" value={filters.end} onChange={handleFilterChange('end')} style={{ width: 'auto' }} />
          <select className="form-input" value={filters.supplier_id} onChange={handleFilterChange('supplier_id')} style={{ width: 'auto' }}>
            <option value="">Todos os Fornecedores</option>
            {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>

      {loading && <p className="loading-text" style={{ textAlign: 'center', padding: '2rem' }}>Calculando KPIs...</p>}

      {!loading && stats && (
        <>
          {/* KPIs principais */}
          <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <KpiCard label="Volume Total" value={volumeTotal} sub="Documentos no período" />
            <KpiCard label="Acordo de Nível de Serviço" value={`${slaPct}%`} sub="Respostas no prazo" accent={slaPct < 80 ? 'danger' : 'success'} />
            <KpiCard label="Tempo Médio de Resolução" value={`${stats.mttr} dias`} sub="Tempo de resolução" accent="warning" />
            <KpiCard label="Reincidências" value={stats.recurrenceCount} sub="Eventos vinculados" accent="info" />
          </div>

          <div className="dash-grid">
            {/* Status overview */}
            <div className="card dash-card">
              <h2 className="card-section-title">Status dos Documentos</h2>
              <div className="dash-status-list">
                {[
                  { label: 'Aberto', status: 'ABERTO' },
                  { label: 'Em análise', status: 'EM_ANALISE' },
                  { label: 'Env. Fornecedor', status: 'ENVIADO_FORNECEDOR' },
                  { label: 'Concluído', status: 'CONCLUIDO' },
                  { label: 'Cancelado', status: 'CANCELADO' },
                ].map(({ label, status }) => {
                  const count = stats.volume.filter(v => v.status === status).reduce((acc, v) => acc + parseInt(v.count), 0);
                  return (
                    <div key={status} className="dash-status-row">
                      <StatusBadge status={status} />
                      <span className="dash-status-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alertas de SLA */}
            <div className="card dash-card">
              <h2 className="card-section-title">Alertas de SLA</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                  <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#b91c1c' }}>{stats.delayedCount}</span>
                  <p style={{ fontSize: '14px', color: '#7f1d1d', marginTop: '4px' }}>NCs com atraso de resposta (> 10 dias úteis)</p>
                </div>

                <div className="dash-type-list">
                  <h3 style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Distribuição por Tipo</h3>
                  {['RNC', 'RAQ', 'RHE'].map(type => {
                    const count = stats.volume.filter(v => v.type === type).reduce((acc, v) => acc + parseInt(v.count), 0);
                    const pct = volumeTotal > 0 ? Math.round((count / volumeTotal) * 100) : 0;
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
            </div>
          </div>
        </>
      )}
    </div>
  );
}
