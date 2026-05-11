import React, { useState } from 'react';
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
  const { documents, loading, error, addDocument, updateDocument, deleteDocument } = useDocumentos();
  const { suppliers } = useFornecedores();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [confirmId, setConfirmId]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [signatures, setSignatures] = useState(null);

  const [filterType, setFilterType]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch]             = useState('');

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setDrawerOpen(true); };

  const openEdit = (doc) => {
    setEditing(doc.id);
    setForm({
      code: doc.code, type: doc.type,
      supplier_id: doc.supplier_id ?? '',
      item_description: doc.item_description,
      defect_category: doc.defect_category,
      status: doc.status,
      occurrence_context: doc.occurrence_context || 'PRODUCT',
      impact_regulatory: doc.impact_regulatory || false,
      impact_customer: doc.impact_customer || false,
      impact_production: doc.impact_production || false,
      audit_finding_type: doc.audit_finding_type || 'MINOR'
    });
    setDrawerOpen(true);
    if (doc.status === 'AGUARDANDO_ASSINATURAS') {
      fetchSignatures(doc.id);
    } else {
      setSignatures(null);
    }
  };

  const fetchSignatures = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/signatures/${id}/status`, {
        headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
      });
      if (res.ok) setSignatures(await res.json());
    } catch (err) { console.error('Erro ao buscar assinaturas', err); }
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
          <option value="ABERTO">Aberto</option>
          <option value="EM_ANALISE">Em Análise</option>
          <option value="ENVIADO_FORNECEDOR">Env. Fornecedor</option>
          <option value="AGUARDANDO_ASSINATURAS">Aguardando Assinaturas</option>
          <option value="AGUARDANDO_DISPOSICAO">Aguardando Disposição</option>
          <option value="CONCLUIDO">Concluído</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
      </div>

      {error && <p className="error-banner">⚠ {error} — <button className="link-btn" onClick={() => window.location.reload()}>tentar novamente</button></p>}

      <div className="card table-card">
        {loading ? (
          <p className="loading-text">Carregando...</p>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📄" title="Nenhum documento encontrado"
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
                        <button className="btn-icon" title="Gerar Relatório 8D" 
                          onClick={async () => {
                            try {
                              const res = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate/${d.id}`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.error || 'Erro na geração');
                              }
                              const report = await res.json();
                              window.open(`${import.meta.env.VITE_API_URL}/reports/download/${report.id}`, '_blank');
                              toast('Relatório 8D gerado com sucesso');
                            } catch (err) {
                              toast(err.message, 'error');
                            }
                          }}>📄</button>
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
                <option value="ABERTO">Aberto</option>
                <option value="EM_ANALISE">Em Análise</option>
                <option value="ENVIADO_FORNECEDOR">Env. Fornecedor</option>
                <option value="AGUARDANDO_ASSINATURAS">Aguardando Assinaturas</option>
                <option value="AGUARDANDO_DISPOSICAO">Aguardando Disposição</option>
                <option value="CONCLUIDO">Concluído</option>
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
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#475569', marginBottom: '1rem' }}>🛡️ AVALIAÇÃO DE SEVERIDADE (AUTOMÁTICA)</p>
              
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

          {editing && form.status === 'AGUARDANDO_ASSINATURAS' && signatures && (
            <div className="signatures-panel" style={{ marginTop: '1.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#64748b' }}>🖊️ ASSINATURAS EM PARALELO (BR-07)</span>
                {signatures.closureAllowed && (
                  <button type="button" className="btn-primary" style={{ padding: '4px 8px', fontSize: '10px' }}
                    onClick={() => setForm(f => ({ ...f, status: 'AGUARDANDO_DISPOSICAO' }))}>
                    Liberar para Disposição ➡️
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
                      {s.status === 'ESCALATED' && <span title="SLA Estourado" style={{ fontSize: '14px' }}>⚠️</span>}
                      {s.status === 'SIGNED' ? (
                        <span style={{ color: '#10b981', fontWeight: '700', fontSize: '11px' }}>✅ OK</span>
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
                🛡️ Disposição de Material (BR-06)
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
    </div>
  );
}
