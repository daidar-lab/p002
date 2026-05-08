import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import './Dashboards.css';

const KPICard = ({ title, derivation, children, sourceCount, latestDate }) => (
  <div className="kpi-card">
    <div className="kpi-header">
      <h3 className="kpi-title">{title}</h3>
      <span className="kpi-derivation">Derivado de Auditoria {derivation}</span>
    </div>
    <div className="kpi-chart-container">
      {children}
    </div>
    <div className="kpi-footer">
      <span className="kpi-source-meta">Base: {sourceCount} snapshots</span>
      <span className="kpi-badge">Última Auditoria: {latestDate}</span>
    </div>
  </div>
);

export default function Dashboards() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/audits/history`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
      .then(res => res.json())
      .then(data => setHistory(data))
      .finally(() => setLoading(false));
  }, []);

  // --- Transformadores de Dados (Soberania dos Snapshots) ---

  // 1. Lead Time Evolution (FLOW)
  const flowData = history
    .filter(a => a.audit_type === 'FLOW')
    .sort((a, b) => new Date(a.period_start) - new Date(b.period_start))
    .map(a => {
      const avgLeadTime = a.result_snapshot.metrics.reduce((acc, m) => acc + m.avg_time_ms, 0) / (a.result_snapshot.metrics.length || 1);
      return {
        period: new Date(a.period_start).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        hours: parseFloat((avgLeadTime / (1000 * 60 * 60)).toFixed(1)),
        fullDate: new Date(a.generated_at).toLocaleDateString(),
        count: a.result_snapshot.summary.total_transitions
      };
    });

  // 2. Efficacy Rate (DECISION)
  const efficacyData = history
    .filter(a => a.audit_type === 'DECISION')
    .sort((a, b) => new Date(a.period_start) - new Date(b.period_start))
    .map(a => {
      const total = a.result_snapshot.metrics.reduce((acc, m) => acc + m.count, 0);
      const effective = a.result_snapshot.metrics.find(m => m.decision === 'ENCERRAMENTO_DEFINITIVO')?.count || 0;
      return {
        period: new Date(a.period_start).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        rate: parseFloat(((effective / (total || 1)) * 100).toFixed(1)),
        total
      };
    });

  // 3. Signature Latency (SIGNATURE)
  const signatureData = history
    .filter(a => a.audit_type === 'SIGNATURE')
    .sort((a, b) => new Date(a.period_start) - new Date(b.period_start))
    .map(a => {
      const item = { period: new Date(a.period_start).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }) };
      a.result_snapshot.metrics.forEach(m => {
        item[m.role] = parseFloat((m.avg_latency_ms / (1000 * 60 * 60)).toFixed(1));
      });
      return item;
    });

  const latestFlow = flowData[flowData.length - 1];
  const latestEfficacy = efficacyData[efficacyData.length - 1];
  const latestSig = signatureData[signatureData.length - 1];

  return (
    <div className="dashboard-page">
      <header className="dashboard-banner">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem' }}>Dashboards de KPI de Qualidade</h1>
          <p className="dashboard-banner-text">Visualização gerencial baseada em auditorias concluídas. Sem dados operacionais em tempo real.</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span className="kpi-badge" style={{ background: '#3b82f6', color: 'white' }}>Audit Quality Soberano</span>
        </div>
      </header>

      {loading ? <p>Carregando dados consolidados...</p> : (
        <div className="dashboard-grid">
          
          {/* Gráfico 1: Evolução de Lead Time */}
          <KPICard 
            title="Evolução do Lead Time Médio (Horas)" 
            derivation="FLOW"
            sourceCount={flowData.length}
            latestDate={latestFlow?.fullDate || '—'}
          >
            {flowData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={flowData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontSize: '14px', fontWeight: 700 }}
                  />
                  <Line type="monotone" dataKey="hours" name="Média (h)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 6, fill: '#3b82f6' }} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <NoData type="FLOW" />}
          </KPICard>

          {/* Gráfico 2: Eficácia Técnica */}
          <KPICard 
            title="Taxa de Encerramento Definitivo (%)" 
            derivation="DECISION"
            sourceCount={efficacyData.length}
            latestDate={latestEfficacy ? 'Auditado' : '—'}
          >
            {efficacyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficacyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} unit="%" />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="rate" name="Eficácia (%)" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData type="DECISION" />}
          </KPICard>

          {/* Gráfico 3: Latência de Assinaturas */}
          <KPICard 
            title="Latência Média por Papel (Horas)" 
            derivation="SIGNATURE"
            sourceCount={signatureData.length}
            latestDate={latestSig ? 'Auditado' : '—'}
          >
            {signatureData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={signatureData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Line type="monotone" dataKey="qualidade" name="Qualidade" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="coordenacao" name="Coordenação" stroke="#f59e0b" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="diretoria" name="Diretoria" stroke="#0f172a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : <NoData type="SIGNATURE" />}
          </KPICard>

        </div>
      )}
    </div>
  );
}

const NoData = ({ type }) => (
  <div className="no-data-overlay">
    <span style={{ fontSize: '2rem' }}>📊</span>
    <p style={{ margin: 0 }}>Sem auditorias {type} concluídas.</p>
    <small>Execute a Auditoria de Processo para gerar este KPI.</small>
  </div>
);
