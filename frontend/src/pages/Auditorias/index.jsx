import React, { useState } from 'react';
import { useDocumentos } from '../../hooks/useData.js';
import { TypeBadge, StatusBadge } from '../../components/Badge.jsx';
import { rankByGUT, gutLevel, calcGUT } from '../../utils/gut.js';
import { mockTimeline } from '../../utils/mockData.js';
import EmptyState from '../../components/EmptyState.jsx';

function AuditoriaDetalhe({ doc, onBack }) {
  const score = calcGUT(doc.gravity, doc.urgency, doc.tendency);
  const { label, color } = gutLevel(score);
  const timeline = mockTimeline.filter(t => t.doc_id === doc.id);

  return (
    <div className="page">
      <div className="page-header">
        <div className="detalhe-back">
          <button className="btn-ghost btn-back" onClick={onBack}>← Voltar</button>
          <div>
            <h1 className="page-title">{doc.code}</h1>
            <p className="page-subtitle">{doc.supplier_name}</p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      <div className="detalhe-grid">
        {/* Coluna esquerda */}
        <div className="detalhe-col">
          <div className="card detalhe-card">
            <h2 className="card-section-title">Informações gerais</h2>
            <dl className="info-list">
              <dt>Tipo</dt><dd><TypeBadge type={doc.type} /></dd>
              <dt>Categoria</dt><dd>{doc.defect_category}</dd>
              <dt>Data de abertura</dt><dd>{doc.created_at}</dd>
              <dt>Fornecedor</dt><dd>{doc.supplier_name}</dd>
            </dl>
          </div>

          <div className="card detalhe-card">
            <h2 className="card-section-title">Descrição</h2>
            <p className="detalhe-desc">{doc.item_description}</p>
          </div>

          <div className="card detalhe-card">
            <h2 className="card-section-title">Evidências</h2>
            <EmptyState icon="📎" title="Nenhuma evidência anexada"
              description="Funcionalidade de upload disponível com backend."
            />
          </div>
        </div>

        {/* Coluna direita */}
        <div className="detalhe-col">
          <div className="card detalhe-card">
            <h2 className="card-section-title">Score GUT</h2>
            <div className="gut-score-display">
              <div className="gut-score-main">
                <span className="gut-score-number">{score}</span>
                <span className={`badge badge--gut-${color} badge--lg`}>{label}</span>
              </div>
              <div className="gut-score-breakdown">
                <div className="gut-factor">
                  <span className="gut-factor__label">Gravidade</span>
                  <span className="gut-factor__value">{doc.gravity}</span>
                </div>
                <span className="gut-factor__op">×</span>
                <div className="gut-factor">
                  <span className="gut-factor__label">Urgência</span>
                  <span className="gut-factor__value">{doc.urgency}</span>
                </div>
                <span className="gut-factor__op">×</span>
                <div className="gut-factor">
                  <span className="gut-factor__label">Tendência</span>
                  <span className="gut-factor__value">{doc.tendency}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card detalhe-card">
            <h2 className="card-section-title">Timeline</h2>
            {timeline.length === 0 ? (
              <EmptyState icon="📅" title="Nenhum evento registrado" />
            ) : (
              <ul className="timeline">
                {timeline.map(t => (
                  <li key={t.id} className="timeline__item">
                    <div className="timeline__dot" />
                    <div className="timeline__content">
                      <p className="timeline__action">{t.action}</p>
                      <p className="timeline__detail">{t.detail}</p>
                      <p className="timeline__meta">{t.date} · {t.user}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Auditorias() {
  const { documents, loading } = useDocumentos();
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');

  if (selected) {
    return <AuditoriaDetalhe doc={selected} onBack={() => setSelected(null)} />;
  }

  const ranked = rankByGUT(documents);
  const filtered = ranked.filter(d =>
    !search || d.code.toLowerCase().includes(search.toLowerCase()) ||
    d.supplier_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditorias</h1>
          <p className="page-subtitle">Selecione um documento para ver a análise completa</p>
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
              <tr>
                <th>Código</th><th>Tipo</th><th>Fornecedor</th>
                <th>Status</th><th>Score GUT</th><th>Nível</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const { label, color } = gutLevel(d.gutScore);
                return (
                  <tr key={d.id} className="row--clickable" onClick={() => setSelected(d)}>
                    <td className="mono">{d.code}</td>
                    <td><TypeBadge type={d.type} /></td>
                    <td>{d.supplier_name}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="td-score">{d.gutScore}</td>
                    <td><span className={`badge badge--gut-${color}`}>{label}</span></td>
                    <td className="td-actions">
                      <button className="btn-icon" title="Ver auditoria">→</button>
                    </td>
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
