import React, { useState, useEffect, useCallback } from 'react';
import { useRvt } from '../../hooks/useRvt.js';
import { useFornecedores, useDocumentos } from '../../hooks/useData.js';
import { StatusBadge } from '../../components/Badge.jsx';
import { Pagination } from '../../components/Pagination.jsx';

export default function Rvt() {
  const { rvts, total, page, limit, loading, refresh, createRvt, updateRvt, finalizeRvt } = useRvt();
  const { suppliers } = useFornecedores();
  const { documents } = useDocumentos();

  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('scheduling');
  const [isNew, setIsNew] = useState(false);
  const [search, setSearch] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartCompany, setNewPartCompany] = useState('');

  // Evidências (fotos + descrição)
  const [newEvidenceDesc, setNewEvidenceDesc] = useState('');
  const [newEvidenceFile, setNewEvidenceFile] = useState(null);
  const [newEvidencePreview, setNewEvidencePreview] = useState(null);
  const [lightbox, setLightbox] = useState(null); // URL da foto em lightbox

  // Form State
  const [formData, setFormData] = useState({
    supplier_id: '',
    window_start: '',
    window_end: '',
    product_name: '',
    visit_date: '',
    pauta: '',
    subjects_covered: '',
    conclusion: '',
    participants: [],
    links: []
  });

  // Sincroniza busca com o servidor
  React.useEffect(() => {
    refresh({ page: 1, limit, search });
  }, [search, refresh, limit]);

  const onPageChange = (p) => {
    refresh({ page: p, limit, search });
  };

  const handleOpenDetail = async (rvt) => {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/rvt/${rvt.id}`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
    });
    const detail = await res.json();
    setSelected(detail);
    setNewPartName('');
    setNewPartCompany('');
    setFormData({
      ...detail,
      participants: detail.participants || [],
      links: detail.links?.map(l => l.id) || [],
      evidences: detail.evidences || []
    });
    setIsNew(false);
  };

  const handleNew = () => {
    setSelected(null);
    setIsNew(true);
    setActiveTab('scheduling');
    setNewPartName('');
    setNewPartCompany('');
    setFormData({
      supplier_id: '',
      window_start: '',
      window_end: '',
      product_name: '',
      visit_date: '',
      pauta: '',
      subjects_covered: '',
      conclusion: '',
      participants: [],
      links: [],
      evidences: []
    });
  };

  const handleSave = async () => {
    try {
      if (isNew) {
        await createRvt(formData);
        setIsNew(false);
      } else {
        await updateRvt(selected.id, formData);
      }
      alert('RVT salvo com sucesso!');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Deseja finalizar o relatório e disparar o fluxo de assinaturas?')) return;
    try {
      await finalizeRvt(selected.id);
      alert('RVT finalizado e enviado para assinaturas!');
      handleOpenDetail(selected);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Visitas Técnicas (RVT)</h1>
          <p className="page-subtitle">Gestão de agendamentos e execução técnica</p>
        </div>
        <button className="btn-primary" onClick={handleNew}>+ Nova Visita</button>
      </div>

      <div className="dash-grid" style={{ gridTemplateColumns: '350px 1fr' }}>
        {/* Listagem */}
        <aside className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '15px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <h3 style={{ fontSize: '13px', color: '#64748b', marginBottom: '10px' }}>HISTÓRICO DE VISITAS</h3>
            <input
              type="text"
              className="form-input"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '8px', fontSize: '13px' }}
            />
          </div>
          <div className="rvt-list" style={{ flex: 1, overflowY: 'auto' }}>
            {rvts.map(r => (
              <div key={r.id}
                className={`rvt-item ${selected?.id === r.id ? 'rvt-item--active' : ''}`}
                onClick={() => handleOpenDetail(r)}
                style={{ padding: '15px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'all 0.2s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{r.code}</span>
                  <StatusBadge status={r.status} />
                </div>
                <div style={{ fontSize: '12px', color: '#64748b' }}>{r.supplier_name}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '5px' }}>
                  {r.visit_date ? new Date(r.visit_date).toLocaleDateString() : 'Não agendada'}
                </div>
              </div>
            ))}
          </div>
          <div style={{ padding: '10px', borderTop: '1px solid #e2e8f0' }}>
            <Pagination
              currentPage={page}
              totalItems={total}
              itemsPerPage={limit}
              onPageChange={onPageChange}
            />
          </div>
        </aside>

        {/* Detalhe / Formulário */}
        <main>
          {(selected || isNew) ? (
            <div className="card" style={{ padding: 0 }}>
              <div className="tabs" style={{ display: 'flex', borderBottom: '1px solid #e2e8f0' }}>
                <button className={`tab-btn ${activeTab === 'scheduling' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('scheduling')}>1. Agendamento</button>
                <button className={`tab-btn ${activeTab === 'execution' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('execution')}>2. Execução</button>
                <button className={`tab-btn ${activeTab === 'signatures' ? 'tab-btn--active' : ''}`} onClick={() => setActiveTab('signatures')}>3. Assinaturas</button>
              </div>

              <div style={{ padding: '25px' }}>
                {activeTab === 'scheduling' && (
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Fornecedor</label>
                      <select className="form-input" value={formData.supplier_id} onChange={e => setFormData({ ...formData, supplier_id: e.target.value })} disabled={!isNew}>
                        <option value="">Selecione...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Produto/Serviço</label>
                      <textarea
                        className="form-input"
                        rows="3"
                        placeholder="Ex: Auditoria de Processo, Visita Técnica..."
                        value={formData.product_name || ''}
                        onChange={e => setFormData({ ...formData, product_name: e.target.value })}
                        style={{ resize: 'vertical' }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Janela de Início (Cervejaria)</label>
                      <input type="date" className="form-input" value={formData.window_start?.split('T')[0]} onChange={e => setFormData({ ...formData, window_start: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Janela de Fim (Cervejaria)</label>
                      <input type="date" className="form-input" value={formData.window_end?.split('T')[0]} onChange={e => setFormData({ ...formData, window_end: e.target.value })} />
                    </div>

                    {!isNew && (
                      <div className="form-group">
                        <label className="form-label">Data Confirmada pelo Fornecedor</label>
                        <input type="date" className="form-input" value={formData.visit_date?.split('T')[0]} disabled style={{ background: '#f8fafc', color: '#64748b' }} />
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'execution' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="form-group">
                      <label className="form-label">Pauta da Visita</label>
                      <textarea className="form-input" rows="3" value={formData.pauta} onChange={e => setFormData({ ...formData, pauta: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Assuntos Abordados (Técnico)</label>
                      <textarea className="form-input" rows="8" value={formData.subjects_covered} onChange={e => setFormData({ ...formData, subjects_covered: e.target.value })}
                        placeholder="Descreva RNCs vinculadas, análises técnicas, ações solicitadas..." />
                    </div>

                    {/* ── Evidências Fotográficas ─────────────────── */}
                    <div className="form-group rvt-evidences-section">
                      <div className="rvt-evidences-header">
                        <label className="form-label" style={{ margin: 0 }}>
                          Evidências Fotográficas
                          <span className="rvt-ev-count">
                            {formData.evidences?.length || 0} foto{(formData.evidences?.length || 0) !== 1 ? 's' : ''}
                          </span>
                        </label>
                      </div>

                      {/* Grade de fotos já inseridas */}
                      {formData.evidences && formData.evidences.length > 0 ? (
                        <div className="rvt-ev-grid">
                          {formData.evidences.map((ev, idx) => (
                            <div key={idx} className="rvt-ev-card">
                              <div
                                className="rvt-ev-img-wrap"
                                onClick={() => setLightbox(ev.url)}
                                title="Clique para ampliar"
                              >
                                <img src={ev.url} alt={ev.description || `Foto ${idx + 1}`} className="rvt-ev-img" />
                              </div>
                              <div className="rvt-ev-body">
                                <p className="rvt-ev-desc">
                                  {ev.description || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sem descrição</span>}
                                </p>
                                <button
                                  type="button"
                                  className="rvt-ev-remove"
                                  title="Remover foto"
                                  onClick={() => {
                                    const updated = formData.evidences.filter((_, i) => i !== idx);
                                    setFormData({ ...formData, evidences: updated });
                                  }}
                                >
                                  ✕ Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rvt-ev-empty">
                          <p>Nenhuma foto inserida ainda.</p>
                        </div>
                      )}

                      {/* Input de nova foto */}
                      <div className="rvt-ev-add-box">
                        <p className="rvt-ev-add-title">Adicionar nova foto</p>
                        <div className="rvt-ev-add-row">
                          {/* Área de upload */}
                          <label className="rvt-ev-upload-label">
                            {newEvidencePreview ? (
                              <img src={newEvidencePreview} alt="preview" className="rvt-ev-upload-preview" />
                            ) : (
                              <div className="rvt-ev-upload-placeholder">
                                <span style={{ fontSize: '12px', color: '#64748b' }}>Selecionar imagem</span>
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>JPG, PNG, WEBP</span>
                              </div>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              style={{ display: 'none' }}
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setNewEvidenceFile(file);
                                const reader = new FileReader();
                                reader.onload = ev => setNewEvidencePreview(ev.target.result);
                                reader.readAsDataURL(file);
                              }}
                            />
                          </label>

                          {/* Descrição + botão */}
                          <div className="rvt-ev-add-right">
                            <label className="form-label" style={{ fontSize: '11px', marginBottom: '4px' }}>Descrição da foto</label>
                            <textarea
                              className="form-input"
                              rows="4"
                              placeholder="Ex: Detalhe da não-conformidade no lote #4821, embalagem amassada na lateral..."
                              value={newEvidenceDesc}
                              onChange={e => setNewEvidenceDesc(e.target.value)}
                              style={{ resize: 'vertical', fontSize: '13px' }}
                            />
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ marginTop: '10px', width: '100%' }}
                              disabled={!newEvidencePreview}
                              onClick={() => {
                                if (!newEvidencePreview) return;
                                const newEvidence = {
                                  url: newEvidencePreview,
                                  description: newEvidenceDesc.trim(),
                                  _local: true
                                };
                                setFormData({
                                  ...formData,
                                  evidences: [...(formData.evidences || []), newEvidence]
                                });
                                setNewEvidenceFile(null);
                                setNewEvidencePreview(null);
                                setNewEvidenceDesc('');
                              }}
                            >
                              + Adicionar foto
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* ── fim Evidências ──────────────────────────── */}

                    <div className="form-group">
                      <label className="form-label">Conclusão e Recomendações</label>
                      <textarea className="form-input" rows="4" value={formData.conclusion} onChange={e => setFormData({ ...formData, conclusion: e.target.value })} />
                    </div>

                    <div className="form-group" style={{ background: '#f8fafc', padding: '20px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <label className="form-label" style={{ fontWeight: '600', color: '#0f172a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Participantes da Visita</span>
                        <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'normal' }}>({formData.participants?.length || 0} adicionado{formData.participants?.length !== 1 ? 's' : ''})</span>
                      </label>

                      {/* Lista de participantes adicionados */}
                      {formData.participants && formData.participants.length > 0 ? (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', marginBottom: '20px' }}>
                          {formData.participants.map((p, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              padding: '8px 12px',
                              background: '#ffffff',
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                              transition: 'all 0.2s ease'
                            }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>
                                <span style={{ fontWeight: '600', color: '#1e293b', fontSize: '13px', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{p.name}</span>
                                {p.company && (
                                  <span style={{
                                    fontSize: '10px',
                                    color: '#64748b',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    overflow: 'hidden'
                                  }}>{p.company}</span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const newParticipants = formData.participants.filter((_, i) => i !== idx);
                                  setFormData({ ...formData, participants: newParticipants });
                                }}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                  fontSize: '14px',
                                  padding: '4px',
                                  marginLeft: '8px',
                                  borderRadius: '50%',
                                  width: '24px',
                                  height: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = '#fee2e2';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = 'transparent';
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#64748b',
                          border: '1px dashed #cbd5e1',
                          borderRadius: '8px',
                          fontSize: '13px',
                          marginBottom: '20px',
                          background: '#ffffff'
                        }}>
                          Nenhum participante adicionado ainda.
                        </div>
                      )}

                      {/* Inputs para adicionar novo participante */}
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label className="form-label" style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Nome Completo</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Nome do participante..."
                            value={newPartName}
                            onChange={e => setNewPartName(e.target.value)}
                            style={{ fontSize: '13px', padding: '8px 12px', background: '#ffffff' }}
                          />
                        </div>
                        <div style={{ flex: 1, minWidth: '150px' }}>
                          <label className="form-label" style={{ fontSize: '11px', color: '#475569', marginBottom: '4px' }}>Empresa / Área</label>
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Ex: Gestor qualidade..."
                            value={newPartCompany}
                            onChange={e => setNewPartCompany(e.target.value)}
                            style={{ fontSize: '13px', padding: '8px 12px', background: '#ffffff' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{
                            padding: '9px 20px',
                            fontSize: '13px',
                            fontWeight: '600',
                            height: '38px',
                            background: '#2563eb',
                            borderColor: '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '4px',
                            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)'
                          }}
                          onClick={() => {
                            const name = newPartName.trim();
                            const company = newPartCompany.trim();
                            if (!name) {
                              alert('Por favor, informe pelo menos o nome do participante.');
                              return;
                            }
                            const newParticipant = { name, company: company || '' };
                            setFormData({
                              ...formData,
                              participants: [...(formData.participants || []), newParticipant]
                            });
                            setNewPartName('');
                            setNewPartCompany('');
                          }}
                        >
                          + Adicionar
                        </button>
                      </div>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Vínculo com RNCs</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '10px' }}>
                        {documents.filter(d => d.type === 'RNC').map(d => (
                          <label key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                            <input type="checkbox" checked={formData.links.includes(d.id)}
                              onChange={e => {
                                const newLinks = e.target.checked ? [...formData.links, d.id] : formData.links.filter(id => id !== d.id);
                                setFormData({ ...formData, links: newLinks });
                              }} />
                            {d.code}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'signatures' && (
                  <div className="signature-list">
                    {selected?.signatures?.map(s => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', marginBottom: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#1e293b' }}>{s.role}</div>
                          <div style={{ fontSize: '12px', color: '#64748b' }}>{s.signer_name || 'Aguardando assinatura...'}</div>
                        </div>
                        {s.status === 'SIGNED' ? (
                          <span style={{ color: '#059669', fontWeight: 'bold', fontSize: '12px' }}>✓ ASSINADO EM {new Date(s.signed_at).toLocaleDateString()}</span>
                        ) : (
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <span style={{ color: '#94a3b8', fontSize: '12px', alignSelf: 'center' }}>PENDENTE</span>
                            {s.role !== 'Representante Técnico' && selected?.status === 'FINALIZADA' && (
                              <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: '11px' }}
                                onClick={async () => {
                                  if (!window.confirm(`Confirmar assinatura como ${s.role}?`)) return;
                                  try {
                                    const res = await fetch(`${import.meta.env.VITE_API_URL}/rvt/${selected.id}/assinar`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`,
                                        'Content-Type': 'application/json'
                                      },
                                      body: JSON.stringify({ role: s.role })
                                    });
                                    if (!res.ok) throw new Error('Erro ao assinar');
                                    alert('Assinado com sucesso!');
                                    handleOpenDetail(selected);
                                  } catch (err) { alert(err.message); }
                                }}>Assinar</button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    {selected?.status === 'EM_VISITA' && (
                      <button className="btn-primary" style={{ marginTop: '20px', width: '100%' }} onClick={handleFinalize}>Finalizar Relatório</button>
                    )}
                  </div>
                )}

                {(activeTab !== 'signatures') && (
                  <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button className="btn-secondary" onClick={() => setSelected(null)}>Cancelar</button>
                    <button className="btn-primary" onClick={handleSave}>Salvar Alterações</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <h2>Selecione um RVT</h2>
              <p>Escolha um registro na lista ao lado ou crie um novo para gerenciar a visita técnica.</p>
            </div>
          )}
        </main>
      </div>

      {/* ── Lightbox ─────────────────────────────────────── */}
      {lightbox && (
        <div className="rvt-lightbox" onClick={() => setLightbox(null)}>
          <div className="rvt-lightbox__inner" onClick={e => e.stopPropagation()}>
            <button className="rvt-lightbox__close" onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox} alt="Evidência ampliada" className="rvt-lightbox__img" />
          </div>
        </div>
      )}
    </div>
  );
}
