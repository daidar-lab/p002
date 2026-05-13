import React, { useState } from 'react';
import { useAuth } from '../../utils/auth.jsx';
import { useDocumentos } from '../../hooks/useData.js';
import { useFornecedores } from '../../hooks/useData.js';
import Drawer from '../../components/Drawer.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { TypeBadge, StatusBadge } from '../../components/Badge.jsx';
import { toast } from '../../components/Toast.jsx';

const EMPTY_FORM = {
  code: '', type: 'RNC', supplier_id: '',
  item_description: '', defect_category: 'QUALIDADE', status: 'ABERTO',
  occurrence_context: 'PRODUCT', impact_regulatory: false, 
  impact_customer: false, impact_production: false, audit_finding_type: 'MINOR'
};


export default function Documentos() {
  const { user } = useAuth();
  const { documents, loading, error, addDocument, updateDocument, deleteDocument } = useDocumentos();
  const { suppliers } = useFornecedores();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [confirmId, setConfirmId]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [signatures, setSignatures] = useState(null);
  const [acrData, setAcrData]       = useState(null);
  const [eightDData, setEightDData] = useState(null);
  const [eightDOpen, setEightDOpen] = useState(false);

  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setDrawerOpen(true); };

  const openEdit = (doc) => {
    setEditing(doc.id);
    setForm({
      ...doc,
      occurrence_context: doc.occurrence_context || 'PRODUCT',
      impact_regulatory: doc.impact_regulatory || false,
      impact_customer: doc.impact_customer || false,
      impact_production: doc.impact_production || false,
      audit_finding_type: doc.audit_finding_type || 'MINOR'
    });
    setDrawerOpen(true);
    fetchAcr(doc.id);
    if (doc.status === 'AGUARDANDO_ASSINATURAS') {
      fetchSignatures(doc.id);
    } else {
      setSignatures(null);
    }
  };

  const fetchAcr = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${id}/acr`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
      });
      if (res.ok) setAcrData(await res.json());
      else setAcrData(null);
    } catch (err) { setAcrData(null); }
  };

  const fetchSignatures = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/signatures/${id}/status`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
      });
      if (res.ok) setSignatures(await res.json());
    } catch (err) { console.error('Erro ao buscar assinaturas', err); }
  };

  const open8D = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/reports/data/${id}`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar dados do 8D');
      setEightDData(await res.json());
      setEightDOpen(true);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleSign = async (role) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/signatures/${editing}/sign`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`
        },
        body: JSON.stringify({ role })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao assinar');
      }
      toast('Assinatura registrada com sucesso');
      fetchSignatures(editing);
    } catch (err) { toast(err.message, 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing && form.status === 'AGUARDANDO_DISPOSICAO' && form.material_disposition) {
        // Fluxo Especial BR-06: Registrar Disposição
        const approvals = [];
        if (form.material_disposition === 'RETURN_OR_REIMBURSE') {
          approvals.push({ role: 'LOGISTICS', approved_by: 'Sistema (Auto)', reference_id: form.financial_ref });
        }
        
        const res = await fetch(`${import.meta.env.VITE_API_URL}/documents/${editing}/disposition`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}`
          },
          body: JSON.stringify({
            disposition: form.material_disposition,
            additionalApprovals: approvals
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          if (errData.error === 'MISSING_APPROVAL') {
            throw new Error('Ação Bloqueada: Esta disposição exige aprovação de um perfil superior (Coordenação ou Comex).');
          }
          throw new Error(errData.error || 'Erro ao registrar disposição');
        }
        toast('Disposição registrada e documento concluído');
      } else {
        // Fluxo Normal: Create ou Update
        const payload = {
          ...form,
          supplier_id:  form.supplier_id  ? Number(form.supplier_id)  : null,
        };
        if (editing) {
          await updateDocument(editing, payload);
          toast('Documento atualizado');
        } else {
          await addDocument(payload);
          toast('Documento criado');
        }
      }
      setDrawerOpen(false);
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(confirmId);
      toast('Documento excluído', 'error');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const filtered = documents.filter(d => {
    if (filterType   && d.type   !== filterType)   return false;
    if (filterStatus && d.status !== filterStatus)  return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.code.toLowerCase().includes(q) &&
          !(d.item_description || '').toLowerCase().includes(q) &&
          !(d.supplier_name    || '').toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Documentos</h1>
          <p className="page-subtitle">{documents.length} registro{documents.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Novo Documento</button>
      </div>

      <div className="filters">
        <input className="filter-input" placeholder="Buscar por código, descrição ou fornecedor..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option>RNC</option><option>RAQ</option><option>RHE</option>
        </select>
        <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="ABERTO">1. Aberto (Triagem)</option>
          <option value="EM_ANALISE">2. Em Análise (Tratamento)</option>
          <option value="AGUARDANDO_ASSINATURAS">3. Aguardando Assinaturas</option>
          <option value="ENVIADO_FORNECEDOR">4. Enviado ao Fornecedor</option>
          <option value="AGUARDANDO_DISPOSICAO">5. Aguardando Disposição</option>
          <option value="CONCLUIDO">6. Concluído</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {error && <p className="error-banner">⚠ {error} — <button className="link-btn" onClick={() => window.location.reload()}>tentar novamente</button></p>}

      <div className="card table-card">
        {loading ? (
          <p className="loading-text">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon="" title="Nenhum documento encontrado"
            description="Ajuste os filtros ou crie um novo documento."
            action={<button className="btn-primary" onClick={openNew}>+ Novo Documento</button>} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Código</th><th>Tipo</th><th>Fornecedor</th>
                <th>Descrição</th><th>Severidade</th><th>Status</th>
                <th>Data</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.id}>
                  <td className="mono">{d.code}</td>
                  <td><TypeBadge type={d.type} /></td>
                  <td>{d.supplier_name || <span className="text-sub">—</span>}</td>
                  <td className="td-desc">{d.item_description}</td>
                  <td>
                    {d.type === 'RNC' ? (
                      <span className={`badge badge--gut-${(d.severity || 'LOW').toLowerCase()}`}>
                        {d.severity}
                      </span>
                    ) : <span className="text-sub">—</span>}
                  </td>
                  <td><StatusBadge status={d.status} /></td>
                    <td className="text-sub">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="td-actions">
                        {d.type === 'RNC' && d.status === 'CONCLUIDO' && (
                          <button className="btn-icon" title="Relatório 8D (Visualização/Download)" 
                            onClick={() => open8D(d.id)}>8D</button>
                        )}
                        <button className="btn-icon" title="Editar" onClick={() => openEdit(d)}>✏️</button>
                      <button className="btn-icon btn-icon--danger" title="Excluir"
                        onClick={() => setConfirmId(d.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
          </table>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        title={editing ? 'Editar Documento' : 'Novo Documento'}>
        <form className="form" onSubmit={handleSubmit}>

          <label className="form-label">Código
            <input className="form-input" placeholder="ex: RNC-2026-007"
              value={form.code} onChange={set('code')} required />
          </label>

          <div className="form-row">
            <label className="form-label">Tipo
              <select className="form-input" value={form.type} onChange={set('type')}>
                <option>RNC</option><option>RAQ</option><option>RHE</option>
              </select>
            </label>
            <label className="form-label">Status
              <select className="form-input" value={form.status} onChange={set('status')}>
                <option value="ABERTO">1. Aberto (Triagem)</option>
                {form.type !== 'RAQ' && <option value="EM_ANALISE">2. Em Análise (Tratamento)</option>}
                {form.type !== 'RAQ' && <option value="AGUARDANDO_ASSINATURAS">3. Aguardando Assinaturas</option>}
                <option value="ENVIADO_FORNECEDOR">4. Enviado ao Fornecedor</option>
                <option value="AGUARDANDO_DISPOSICAO">5. Aguardando Disposição</option>
                <option value="CONCLUIDO">6. Concluído</option>
                <option value="CANCELADO">Cancelado</option>
              </select>
            </label>
          </div>

          <label className="form-label">Fornecedor
            <select className="form-input" value={form.supplier_id} onChange={set('supplier_id')}>
              <option value="">Sem fornecedor</option>
              {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>

          <label className="form-label">Categoria
            <select className="form-input" value={form.defect_category} onChange={set('defect_category')}>
              <option value="QUALIDADE">Qualidade</option>
              <option value="PROCESSO">Processo</option>
              <option value="MATERIAL">Material</option>
              <option value="SEGURANCA">Segurança</option>
            </select>
          </label>

          {form.type === 'RNC' && (
            <div className="severity-panel" style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>AVALIAÇÃO DE SEVERIDADE (AUTOMÁTICA)</p>
              
              <label className="form-label">Contexto da Ocorrência
                <select className="form-input" value={form.occurrence_context} onChange={set('occurrence_context')}>
                  <option value="PRODUCT">Produto (Linha)</option>
                  <option value="PROCESS">Processo Interno</option>
                  <option value="SUPPLIER">Recebimento Fornecedor</option>
                  <option value="AUDIT">Auditoria de Qualidade</option>
                </select>
              </label>

              {form.occurrence_context === 'AUDIT' && (
                <label className="form-label" style={{ marginTop: '0.5rem' }}>Tipo de Achado
                  <select className="form-input" value={form.audit_finding_type} onChange={set('audit_finding_type')}>
                    <option value="MINOR">Menor (Minor)</option>
                    <option value="MAJOR">Maior (Major)</option>
                  </select>
                </label>
              )}

              <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500' }}>
                  <input type="checkbox" checked={form.impact_regulatory} 
                    onChange={e => setForm(f => ({ ...f, impact_regulatory: e.target.checked }))} />
                  Impacto Regulatório (MAPA / Anvisa)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500' }}>
                  <input type="checkbox" checked={form.impact_customer} 
                    onChange={e => setForm(f => ({ ...f, impact_customer: e.target.checked }))} />
                  Impacto Direto no Cliente
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: '500' }}>
                  <input type="checkbox" checked={form.impact_production} 
                    onChange={e => setForm(f => ({ ...f, impact_production: e.target.checked }))} />
                  Bloqueio de Lote / Saldo / Produção
                </label>
              </div>
            </div>
          )}

          <label className="form-label">Descrição
            <textarea className="form-input form-textarea"
              placeholder="Descreva o problema ou item auditado..."
              value={form.item_description} onChange={set('item_description')} required />
          </label>

          {editing && acrData && (
            <div className="acr-preview-panel" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1', marginBottom: '1rem', textTransform: 'uppercase' }}>
                Investigação Técnica ({acrData.type === '5_WHYS' ? '5 Porquês' : 'Ishikawa'})
              </p>
              
              {acrData.type === '5_WHYS' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {acrData.data?.levels?.map((why, i) => why && (
                    <div key={i} style={{ fontSize: '12px' }}>
                      <span style={{ fontWeight: '700', color: '#0ea5e9' }}>#{i+1}:</span> {why}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {Object.entries(acrData.data?.categories || {}).map(([key, val]) => val && (
                    <div key={key} style={{ fontSize: '11px' }}>
                      <div style={{ fontWeight: '700', color: '#0ea5e9', textTransform: 'capitalize' }}>{key.replace('_', ' ')}</div>
                      <div style={{ color: '#334155' }}>{val}</div>
                    </div>
                  ))}
                </div>
              )}
              
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px dashed #bae6fd' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#0369a1' }}>CAUSA RAIZ IDENTIFICADA:</span>
                <p style={{ fontSize: '13px', fontWeight: '500', color: '#1e293b', margin: '4px 0 0 0' }}>{acrData.root_cause}</p>
              </div>
            </div>
          )}

          {editing && form.type !== 'RAQ' && form.status === 'AGUARDANDO_ASSINATURAS' && signatures && (
            <div className="signatures-panel" style={{ marginTop: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>ASSINATURAS EM PARALELO (BR-07)</span>
                {signatures.closureAllowed && (
                  <button type="button" className="btn-primary" style={{ padding: '4px 8px', fontSize: '10px' }}
                    onClick={() => setForm(f => ({ ...f, status: 'AGUARDANDO_DISPOSICAO' }))}>
                    Liberar para Disposição
                  </button>
                )}
              </div>
              <div style={{ padding: '8px' }}>
                {signatures.signatures.map(s => (
                  <div key={s.role} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #f1f5f9' }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>{s.role}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                        {s.status === 'SIGNED' 
                          ? `Assinado em ${new Date(s.signedAt).toLocaleString()}` 
                          : `SLA: ${new Date(s.slaDeadline).toLocaleString()}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {s.status === 'ESCALATED' && <span title="SLA Estourado" style={{ fontSize: '14px', color: '#ef4444' }}>(!)</span>}
                      {s.status === 'SIGNED' ? (
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '11px' }}>OK</span>
                      ) : (
                        <button type="button" className="btn-ghost" style={{ padding: '4px 8px', fontSize: '10px' }}
                          onClick={() => handleSign(s.role)}>Assinar</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.status === 'AGUARDANDO_DISPOSICAO' && (
            <div className="disposition-panel" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <p style={{ fontWeight: 'bold', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                Disposição de Material (BR-06)
              </p>
              
              <label className="form-label">Decisão de Disposição
                <select className="form-input" value={form.material_disposition || ''} 
                  onChange={e => setForm(f => ({ ...f, material_disposition: e.target.value }))}>
                  <option value="">Selecione a disposição...</option>
                  {form.type === 'RNC' && (
                    <>
                      <option value="RELEASE_WITH_RESTRICTION">Liberar com Restrição</option>
                      <option value="RELEASE_UNDER_CONCESSION">Liberar sob Concessão (Exige Coordenação)</option>
                      <option value="BLOCK_FOR_REWORK">Bloquear para Retrabalho</option>
                      <option value="RETURN_OR_REIMBURSE">Devolução / Ressarcimento</option>
                    </>
                  )}
                  {form.type === 'RAQ' && <option value="SCRAP_OR_DESTROY">Sucatear / Destruir</option>}
                  {form.type === 'RHE' && (
                    <>
                      <option value="APPROVE">Aprovar</option>
                      <option value="REJECT">Reprovar</option>
                      <option value="APPROVE_WITH_CONDITIONS">Aprovar com Condicionantes</option>
                    </>
                  )}
                </select>
              </label>

              {form.material_disposition === 'RETURN_OR_REIMBURSE' && (
                <label className="form-label" style={{ marginTop: '0.5rem' }}>Ref. Financeira (VR-04)
                  <input className="form-input" placeholder="ID de referência" 
                    value={form.financial_ref || ''} 
                    onChange={e => setForm(f => ({ ...f, financial_ref: e.target.value }))} />
                </label>
              )}

              <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                * Ao salvar, a disposição será bloqueada e o documento será concluído.
              </p>
            </div>
          )}


          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setDrawerOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar documento'}
            </button>
          </div>
        </form>
      </Drawer>

      <ConfirmModal open={!!confirmId} title="Excluir documento"
        description="Essa ação não pode ser desfeita. Deseja continuar?"
        onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />

      {/* MODAL 8D DINÂMICO (BR-XX) */}
      <Drawer open={eightDOpen} onClose={() => setEightDOpen(false)} title={`Relatório 8D - ${eightDData?.document?.code}`}>
        {eightDData && (
          <div className="eightd-preview">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
              <button className="btn-primary" onClick={() => {
                const token = sessionStorage.getItem('aq_token');
                window.open(`${import.meta.env.VITE_API_URL}/reports/pdf/${eightDData.document.id}?token=${token}`, '_blank');
              }}>⬇ Baixar PDF</button>
              <small style={{ color: '#94a3b8' }}>Gerado em: {new Date(eightDData.generated_at).toLocaleString()}</small>
            </div>

            <section className="preview-section">
              <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>D1 - IDENTIFICAÇÃO</h4>
              <div style={{ fontSize: '13px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                <div><strong>Fornecedor:</strong> {eightDData.document.supplier_name}</div>
                <div><strong>Data:</strong> {new Date(eightDData.document.created_at).toLocaleDateString()}</div>
              </div>
              <p style={{ fontSize: '13px', marginTop: '10px' }}><strong>Descrição:</strong> {eightDData.document.item_description}</p>
            </section>

            <section className="preview-section" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>D2 - ANÁLISE DE CAUSA RAIZ</h4>
              <p style={{ fontSize: '13px', marginTop: '10px' }}><strong>Método:</strong> {eightDData.acr?.type === '5_WHYS' ? '5 Porquês' : 'Ishikawa'}</p>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', marginTop: '8px' }}>
                <p style={{ fontSize: '14px', fontWeight: '600' }}>{eightDData.acr?.root_cause || 'Causa não descrita'}</p>
              </div>
            </section>

            <section className="preview-section" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>D3/D4 - AÇÕES CORRETIVAS</h4>
              {eightDData.capas.map((capa, i) => (
                <div key={i} style={{ fontSize: '12px', padding: '8px', borderLeft: '3px solid #3b82f6', background: '#f0f9ff', marginTop: '8px' }}>
                  <strong>[{capa.type}]</strong> {capa.description}
                  <div style={{ color: '#64748b' }}>Responsável: {capa.responsible} | Prazo: {new Date(capa.due_date).toLocaleDateString()}</div>
                </div>
              ))}
            </section>

            <section className="preview-section" style={{ marginTop: '1.5rem' }}>
              <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>D5 - VERIFICAÇÃO</h4>
              <div style={{ fontSize: '13px', marginTop: '10px' }}>
                <div><strong>Decisão:</strong> {eightDData.decision?.decision}</div>
                <p style={{ color: '#64748b', fontSize: '12px' }}>{eightDData.decision?.evidence_summary}</p>
              </div>
            </section>
          </div>
        )}
      </Drawer>
    </div>
  );
}
