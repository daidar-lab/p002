import React, { useState, useEffect } from 'react';
import './ProcessAudits.css';

const AuditTypeBadge = ({ type }) => {
  const colors = {
    FLOW: '#3b82f6',
    DECISION: '#10b981',
    CAPA: '#f59e0b',
    SIGNATURE: '#8b5cf6',
    RECURRENCE: '#ef4444'
  };
  return (
    <span className="snapshot-type-badge" style={{ color: colors[type], border: `1px solid ${colors[type]}22`, background: `${colors[type]}11` }}>
      {type}
    </span>
  );
};

const MetricRenderer = ({ audit, compareWith = null }) => {
  const { audit_type, result_snapshot } = audit;

  const renderSingle = (data) => {
    if (audit_type === 'FLOW') {
      return (
        <div className="audit-detail-content">
          <div className="metric-cards">
            <div className="metric-card">
              <span className="metric-value">{data.summary.total_transitions}</span>
              <span className="metric-label">Total de Transições</span>
            </div>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Caminho</th><th>Tempo Médio</th><th>Atrasos</th></tr>
            </thead>
            <tbody>
              {data.metrics.map((m, i) => (
                <tr key={i}>
                  <td>{m.path}</td>
                  <td>{(m.avg_time_ms / (1000 * 60 * 60)).toFixed(1)}h</td>
                  <td>{m.late_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (audit_type === 'SIGNATURE') {
      return (
        <table className="data-table">
          <thead>
            <tr><th>Papel</th><th>Latência Média</th><th>Total</th></tr>
          </thead>
          <tbody>
            {data.metrics.map((m, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700 }}>{m.role.toUpperCase()}</td>
                <td>{(m.avg_latency_ms / (1000 * 60 * 60)).toFixed(1)}h</td>
                <td>{m.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return <pre>{JSON.stringify(data, null, 2)}</pre>;
  };

  if (compareWith) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div>
          <h4 style={{ color: '#64748b', fontSize: '0.7rem' }}>SNAPSHOT A ({new Date(audit.generated_at).toLocaleDateString()})</h4>
          {renderSingle(result_snapshot)}
        </div>
        <div style={{ borderLeft: '1px solid #e2e8f0', paddingLeft: 24 }}>
          <h4 style={{ color: '#64748b', fontSize: '0.7rem' }}>SNAPSHOT B ({new Date(compareWith.generated_at).toLocaleDateString()})</h4>
          {renderSingle(compareWith.result_snapshot)}
        </div>
      </div>
    );
  }

  return renderSingle(result_snapshot);
};

export default function Auditorias() {
  const [activeTab, setActiveTab] = useState('meta');
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [compareWith, setCompareWith] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/audits/history`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => {
        setHistory(data);
        if (data.length > 0) setSelected(data[0]);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = (audit) => {
    if (compareWith) {
      if (audit.audit_type !== selected.audit_type) {
        alert('Comparação permitida apenas entre snapshots do mesmo tipo.');
        return;
      }
      setCompareWith(audit);
    } else {
      setSelected(audit);
    }
  };

  return (
    <div className="audit-page">
      <header className="page-header">
        <h1 className="page-title">Meta-Governança SGNC</h1>
        <p className="page-subtitle">Auditoria de Processos e Conformidade Sistêmica</p>
      </header>

      <div className="audit-tabs">
        <button 
          className={`tab-btn ${activeTab === 'meta' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('meta')}
        >
          Snapshots de Auditoria
        </button>
        <button 
          className={`tab-btn ${activeTab === 'config' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('config')}
        >
          Configurações de Regras
        </button>
      </div>

      {activeTab === 'meta' && (
        <div className="snapshot-grid">
          <aside className="snapshot-list">
            <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <small style={{ fontWeight: 700, color: '#64748b' }}>HISTÓRICO</small>
              <button 
                className={`btn-ghost ${compareWith ? 'btn-active' : ''}`}
                style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                onClick={() => setCompareWith(compareWith ? null : {})}
              >
                {compareWith ? 'Sair da Comparação' : 'Modo Comparar'}
              </button>
            </div>
            {loading ? <p style={{ padding: 16 }}>Carregando...</p> : history.map(audit => (
              <div 
                key={audit.id} 
                className={`snapshot-item ${selected?.id === audit.id || compareWith?.id === audit.id ? 'snapshot-item--active' : ''}`}
                onClick={() => handleSelect(audit)}
              >
                <AuditTypeBadge type={audit.audit_type} />
                <p className="snapshot-date">Período: {new Date(audit.period_start).toLocaleDateString()} - {new Date(audit.period_end).toLocaleDateString()}</p>
                <p className="snapshot-meta">Executado por: {audit.executor_name}</p>
              </div>
            ))}
          </aside>

          <main className="detail-view">
            {selected ? (
              <>
                <header className="detail-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <AuditTypeBadge type={selected.audit_type} />
                      <h2 style={{ margin: '8px 0' }}>{compareWith?.id ? 'Comparação de Snapshots' : 'Detalhamento da Auditoria'}</h2>
                    </div>
                  </div>
                </header>
                <MetricRenderer audit={selected} compareWith={compareWith?.id ? compareWith : null} />
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 100 }}>
                <p style={{ color: '#94a3b8' }}>Selecione um snapshot para visualizar o rastro factual.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="card" style={{ padding: 32, textAlign: 'center' }}>
          <h3>Governança de Regras Invariantes</h3>
          <p style={{ color: '#64748b' }}>As regras de negócio (BRs) são determinísticas e fixadas no backend. Esta área exibirá a documentação técnica das versões vigentes.</p>
        </div>
      )}
    </div>
  );
}
