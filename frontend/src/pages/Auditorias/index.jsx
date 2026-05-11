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

    if (audit_type === 'DECISION') {
      return (
        <table className="data-table">
          <thead>
            <tr><th>Decisão Técnica</th><th>Quantidade</th><th>Documentos Únicos</th></tr>
          </thead>
          <tbody>
            {data.metrics.map((m, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700 }}>{m.decision}</td>
                <td>{m.count}</td>
                <td>{m.documents}</td>
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
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/audits/history`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistory(data);
          if (data.length > 0) setSelected(data[0]);
        } else {
          setHistory([]);
        }
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

  // Lógica de agrupamento por horário (Dossiê)
  const groupedHistory = history.reduce((acc, curr) => {
    const timeKey = new Date(curr.generated_at).toISOString().slice(0, 19); // Agrupa por segundo exato
    if (!acc[timeKey]) acc[timeKey] = [];
    acc[timeKey].push(curr);
    return acc;
  }, {});

  const [expandedGroups, setExpandedGroups] = useState({});

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="audit-page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Meta-Governança SGNC</h1>
          <p className="page-subtitle">Auditoria de Processos e Conformidade Sistêmica</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={async () => {
            try {
              const res = await fetch(`${import.meta.env.VITE_API_URL}/audits/generate`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
              });
              if (res.ok) {
                alert('Dossiê de auditoria gerado com sucesso!');
                window.location.reload();
              }
            } catch (err) { alert('Erro ao gerar snapshot'); }
          }}
        >
          Gerar Novo Snapshot
        </button>
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
            <div style={{ padding: 12, borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                <small style={{ fontWeight: 700, color: '#64748b' }}>HISTÓRICO DE DOSSIÊS</small>
                <button 
                  className={`btn-ghost ${compareWith ? 'btn-active' : ''}`}
                  style={{ fontSize: '0.7rem', padding: '2px 8px' }}
                  onClick={() => setCompareWith(compareWith ? null : {})}
                >
                  {compareWith ? 'Sair da Comparação' : 'Modo Comparar'}
                </button>
              </div>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <p style={{ padding: 16 }}>Carregando...</p>
              ) : Object.keys(groupedHistory).length === 0 ? (
                <p style={{ padding: 16, color: '#94a3b8', textAlign: 'center' }}>Nenhum dossiê gerado.</p>
              ) : Object.keys(groupedHistory).map(timeKey => {
                const group = groupedHistory[timeKey];
                const isExpanded = expandedGroups[timeKey] || group.some(a => a.id === selected?.id);
                
                return (
                  <div key={timeKey} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div 
                      style={{ 
                        padding: '12px 16px', cursor: 'pointer', background: isExpanded ? '#f8fafc' : '#fff',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                      }}
                      onClick={() => toggleGroup(timeKey)}
                    >
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px' }}>Dossiê {new Date(timeKey).toLocaleTimeString()}</div>
                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(timeKey).toLocaleDateString()} • {group.length} Snapshots</div>
                      </div>
                      <span style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: '0.2s' }}>▼</span>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '4px 16px 12px 16px', background: '#f8fafc' }}>
                        {group.map(audit => (
                          <div 
                            key={audit.id} 
                            className={`snapshot-subitem ${selected?.id === audit.id ? 'active' : ''}`}
                            style={{ 
                              padding: '8px 12px', margin: '4px 0', borderRadius: '6px', cursor: 'pointer',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              background: selected?.id === audit.id ? '#1e293b' : '#fff',
                              color: selected?.id === audit.id ? '#fff' : 'inherit',
                              border: '1px solid #e2e8f0'
                            }}
                            onClick={(e) => { e.stopPropagation(); handleSelect(audit); }}
                          >
                            <AuditTypeBadge type={audit.audit_type} />
                            <small style={{ fontSize: '9px' }}>{audit.audit_type}</small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
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
        <div className="rules-governance">
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Matriz de Governança Invariante (V1.2)</h3>
            <p style={{ color: '#64748b', fontSize: '14px' }}>As regras abaixo são executadas de forma determinística pelo backend e não podem ser alteradas sem revisão de código (Hardened Logic).</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card rule-card">
              <div className="badge badge--gut-high" style={{ marginBottom: 8 }}>BR-05: Reincidência</div>
              <h4>Controle de Recorrência</h4>
              <p className="text-sub" style={{ fontSize: '13px' }}>Se um fornecedor tiver 2 ou mais RAQs da mesma categoria em 12 meses, a 3ª ocorrência é escalonada automaticamente para RNC.</p>
            </div>

            <div className="card rule-card">
              <div className="badge badge--gut-medium" style={{ marginBottom: 8 }}>BR-06: Disposição</div>
              <h4>Segregação de Material</h4>
              <p className="text-sub" style={{ fontSize: '13px' }}>Documentos em disposição financeira (Ressarcimento) exigem aprovação automática do Logístico via ID de referência VR-04.</p>
            </div>

            <div className="card rule-card">
              <div className="badge badge--gut-low" style={{ marginBottom: 8 }}>BR-07: Assinaturas</div>
              <h4>Assinaturas em Paralelo</h4>
              <p className="text-sub" style={{ fontSize: '13px' }}>O fluxo de aprovação é disparado simultaneamente para Gestor e Qualidade. Bloqueio de avanço se qualquer papel estiver pendente.</p>
            </div>

            <div className="card rule-card">
              <div className="badge" style={{ marginBottom: 8, background: '#1e293b', color: '#fff' }}>BR-EVE: Eficácia</div>
              <h4>Motor de Validação</h4>
              <p className="text-sub" style={{ fontSize: '13px' }}>O encerramento definitivo (Status 6) só é permitido se todas as CAPAs estiverem IMPLEMENTADAS ou CONCLUÍDAS com evidência objetiva.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
