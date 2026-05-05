import React, { useState, useEffect } from 'react';
import { useDocumentos } from '../../hooks/useData.js';
import { TypeBadge, StatusBadge } from '../../components/Badge.jsx';
import { rankByGUT, gutLevel, calcGUT } from '../../utils/gut.js';
import EmptyState from '../../components/EmptyState.jsx';
import { api } from '../../utils/api.js';

function Timeline({ docId }) {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getTimeline(docId)
      .then(data => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [docId]);

  if (loading) return <p className="loading-text" style={{ padding: 16 }}>Carregando timeline...</p>;
  if (events.length === 0) return <EmptyState icon="📅" title="Nenhum evento registrado" />;

  return (
    <ul className="timeline">
      {events.map((t, i) => (
        <li key={t.id ?? i} className="timeline__item">
          <div className="timeline__dot" />
          <div className="timeline__content">
            <p className="timeline__action">{t.action}</p>
            {t.detail && <p className="timeline__detail">{t.detail}</p>}
            <p className="timeline__meta">
              {new Date(t.created_at).toLocaleString('pt-BR')}
              {t.user_name ? ` · ${t.user_name}` : ''}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function AuditoriaDetalhe({ doc, onBack }) {
  const score = calcGUT(doc.gut_gravity, doc.gut_urgency, doc.gut_tendency);
  const { label, color } = gutLevel(score);

  return (
    <div className="page">
      <div className="page-header">
        <div className="detalhe-back">
          <button className="btn-ghost btn-back" onClick={onBack}>← Voltar</button>
          <div>
            <h1 className="page-title">{doc.code}</h1>
            <p className="page-subtitle">{doc.supplier_name || 'Sem fornecedor'}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="detalhe-grid">
        <div className="detalhe-col">
          <div className="card detalhe-card">
            <h2 className="card-section-title">Informações gerais</h2>
            <dl className="info-list">
              <dt>Tipo</dt><dd><TypeBadge type={doc.type} /></dd>
              <dt>Categoria</dt><dd>{doc.defect_category}</dd>
              <dt>Abertura</dt><dd>{new Date(doc.created_at).toLocaleDateString('pt-BR')}</dd>
              <dt>Fornecedor</dt><dd>{doc.supplier_name || '—'}</dd>
            </dl>
          </div>

          <div className="card detalhe-card">
            <h2 className="card-section-title">Descrição</h2>
            <p className="detalhe-desc">{doc.item_description}</p>
          </div>

          <div className="card detalhe-card">
            <h2 className="card-section-title">Evidências</h2>
            <EmptyState icon="📎" title="Nenhuma evidência" description="Upload disponível em breve." />
          </div>
        </div>

        <div className="detalhe-col">
          <div className="card detalhe-card">
            <h2 className="card-section-title">Score GUT</h2>
            <div className="gut-score-display">
              <div className="gut-score-main">
                <span className="gut-score-number">{score}</span>
                <span className={`badge badge--gut-${color} badge--lg`}>{label}</span>
              </div>
              <div className="gut-score-breakdown">
                {[['Gravidade', doc.gut_gravity], ['Urgência', doc.gut_urgency], ['Tendência', doc.gut_tendency]].map(([lbl, val], i, arr) => (
                  <React.Fragment key={lbl}>
                    <div className="gut-factor">
                      <span className="gut-factor__label">{lbl}</span>
                      <span className="gut-factor__value">{val}</span>
                    </div>
                    {i < arr.length - 1 && <span className="gut-factor__op">×</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          <div className="card detalhe-card">
            <h2 className="card-section-title">Timeline</h2>
            <Timeline docId={doc.id} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Auditorias() {
  const { documents, loading } = useDocumentos();
  const [selected, setSelected] = useState(null);
  const [search, setSearch]     = useState('');

  if (selected) return <AuditoriaDetalhe doc={selected} onBack={() => setSelected(null)} />;

  const ranked   = rankByGUT(documents);
  const filtered = ranked.filter(d =>
    !search ||
    d.code.toLowerCase().includes(search.toLowerCase()) ||
    (d.supplier_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditorias</h1>
          <p className="page-subtitle">Selecione um documento para análise completa</p>
        </div>
      </div>

      <div className="filters">
        <input className="filter-input" placeholder="Buscar documento..."
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card table-card">
        {loading ? <p className="loading-text">Carregando...</p>
        : filtered.length === 0 ? (
          <EmptyState icon="🔍" title="Nenhum documento encontrado" />
        ) : (
          <table>
            <thead>
              <tr><th>Código</th><th>Tipo</th><th>Fornecedor</th><th>Status</th><th>Score GUT</th><th>Nível</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const { label, color } = gutLevel(d.gutScore);
                return (
                  <tr key={d.id} className="row--clickable" onClick={() => setSelected(d)}>
                    <td className="mono">{d.code}</td>
                    <td><TypeBadge type={d.type} /></td>
                    <td>{d.supplier_name || '—'}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="td-score">{d.gutScore}</td>
                    <td><span className={`badge badge--gut-${color}`}>{label}</span></td>
                    <td className="td-actions"><button className="btn-icon">→</button></td>
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
