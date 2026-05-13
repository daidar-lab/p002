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
  const [loading, setLoading] = useState(false);

  // Query State
  const [queryType, setQueryType] = useState('FLOW');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Compare State
  const [compareMode, setCompareMode] = useState(false);
  const [compStart, setCompStart] = useState(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [compEnd, setCompEnd] = useState(new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

  // Results
  const [selected, setSelected] = useState(null);
  const [compareWith, setCompareWith] = useState(null);

  const runQuery = async () => {
    setLoading(true);
    try {
      // Period A
      const resA = await fetch(`${import.meta.env.VITE_API_URL}/audits/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ type: queryType, start: startDate, end: endDate })
      });
      const dataA = await resA.json();
      setSelected(dataA);

      // Period B (Comparison)
      if (compareMode) {
        const resB = await fetch(`${import.meta.env.VITE_API_URL}/audits/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ type: queryType, start: compStart, end: compEnd })
        });
        const dataB = await resB.json();
        setCompareWith(dataB);
      } else {
        setCompareWith(null);
      }
    } catch (err) {
      alert('Erro ao executar auditoria: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="audit-page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Meta-Governança SGNC</h1>
          <p className="page-subtitle">Auditoria de Processos via Query Dinâmica (Real-time)</p>
        </div>
      </header>

      <div className="audit-tabs">
        <button
          className={`tab-btn ${activeTab === 'meta' ? 'tab-btn--active' : ''}`}
          onClick={() => setActiveTab('meta')}
        >
          Plano de Auditoria
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
          <aside className="snapshot-list" style={{ padding: '20px' }}>
            <div className="query-builder">
              <h3 style={{ fontSize: '13px', marginBottom: '15px', color: '#1e293b' }}>FILTROS DE AUDITORIA</h3>

              <label className="form-label" style={{ fontSize: '11px' }}>Tipo de Fonte:</label>
              <select className="form-input" value={queryType} onChange={e => setQueryType(e.target.value)} style={{ marginBottom: '15px' }}>
                <option value="FLOW">Fluxo de Processos (Flow)</option>
                <option value="DECISION">Decisões Técnicas (Decision)</option>
                <option value="SIGNATURE">Latência de Assinaturas (Signature)</option>
                <option value="RECURRENCE">Padrões de Reincidência</option>
              </select>

              <div className="period-box" style={{ padding: '12px', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: '#0369a1', marginBottom: '8px' }}>PERÍODO PRINCIPAL (A)</p>
                <input type="date" className="form-input" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ marginBottom: '8px' }} />
                <input type="date" className="form-input" value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>

              <div style={{ margin: '15px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={compareMode} onChange={e => setCompareMode(e.target.checked)} id="compMode" />
                <label htmlFor="compMode" style={{ fontSize: '12px', fontWeight: 600 }}>Modo Comparação</label>
              </div>

              {compareMode && (
                <div className="period-box" style={{ padding: '12px', background: '#fdf2f8', borderRadius: '8px', border: '1px solid #fbcfe8', marginBottom: '15px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 700, color: '#9d174d', marginBottom: '8px' }}>PERÍODO DE COMPARAÇÃO (B)</p>
                  <input type="date" className="form-input" value={compStart} onChange={e => setCompStart(e.target.value)} style={{ marginBottom: '8px' }} />
                  <input type="date" className="form-input" value={compEnd} onChange={e => setCompEnd(e.target.value)} />
                </div>
              )}

              <button
                className="btn-primary"
                style={{ width: '100%', marginTop: '10px' }}
                onClick={runQuery}
                disabled={loading}
              >
                {loading ? 'Executando Query...' : 'Executar Auditoria'}
              </button>
            </div>
          </aside>

          <main className="detail-view">
            {selected ? (
              <>
                <header className="detail-header">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <AuditTypeBadge type={selected.audit_type} />
                      <h2 style={{ margin: '8px 0' }}>{compareMode ? 'Análise Comparativa de Períodos' : 'Resultado da Auditoria'}</h2>
                      <p style={{ fontSize: '12px', color: '#64748b' }}>
                        Fonte: {selected.audit_type} | Período: {new Date(selected.period_start).toLocaleDateString()} - {new Date(selected.period_end).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </header>
                <MetricRenderer audit={selected} compareWith={compareWith} />
              </>
            ) : (
              <div style={{ textAlign: 'center', marginTop: 100 }}>
                <p style={{ color: '#94a3b8' }}>Configure os filtros ao lado e execute a query para extrair o rastro factual.</p>
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
