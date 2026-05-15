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
    setFormData({
      ...detail,
      participants: detail.participants || [],
      links: detail.links?.map(l => l.id) || []
    });
    setIsNew(false);
  };

  const handleNew = () => {
    setSelected(null);
    setIsNew(true);
    setActiveTab('scheduling');
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
      links: []
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
                      <input className="form-input" placeholder="Ex: Auditoria de Processo, Visita Técnica..." value={formData.product_name} onChange={e => setFormData({ ...formData, product_name: e.target.value })} />
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
                    <div className="form-group">
                      <label className="form-label">Conclusão e Recomendações</label>
                      <textarea className="form-input" rows="4" value={formData.conclusion} onChange={e => setFormData({ ...formData, conclusion: e.target.value })} />
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
    </div>
  );
}
