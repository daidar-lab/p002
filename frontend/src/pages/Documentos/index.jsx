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
  gut_gravity: 5, gut_urgency: 5, gut_tendency: 5,
};

function GUTInput({ label, name, value, onChange }) {
  return (
    <label className="form-label">
      {label}
      <div className="gut-input-wrap">
        <input
          type="range" min="1" max="9" step="1"
          className="gut-range"
          value={value}
          onChange={onChange}
        />
        <span className="gut-input-val">{value}</span>
      </div>
    </label>
  );
}

export default function Documentos() {
  const { documents, loading, error, addDocument, updateDocument, deleteDocument } = useDocumentos();
  const { suppliers } = useFornecedores();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [confirmId, setConfirmId]   = useState(null);
  const [saving, setSaving]         = useState(false);

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
      gut_gravity:  doc.gut_gravity  ?? 5,
      gut_urgency:  doc.gut_urgency  ?? 5,
      gut_tendency: doc.gut_tendency ?? 5,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        supplier_id:  form.supplier_id  ? Number(form.supplier_id)  : null,
        gut_gravity:  Number(form.gut_gravity),
        gut_urgency:  Number(form.gut_urgency),
        gut_tendency: Number(form.gut_tendency),
      };
      if (editing) {
        await updateDocument(editing, payload);
        toast('Documento atualizado');
      } else {
        await addDocument(payload);
        toast('Documento criado');
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
                <th>Descrição</th><th>Status</th>
                <th title="Score GUT">GUT</th>
                <th>Data</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => {
                const score = (d.gut_gravity ?? 5) + (d.gut_urgency ?? 5) + (d.gut_tendency ?? 5);
                return (
                  <tr key={d.id}>
                    <td className="mono">{d.code}</td>
                    <td><TypeBadge type={d.type} /></td>
                    <td>{d.supplier_name || <span className="text-sub">—</span>}</td>
                    <td className="td-desc">{d.item_description}</td>
                    <td><StatusBadge status={d.status} /></td>
                    <td className="td-score">{score}</td>
                    <td className="text-sub">{new Date(d.created_at).toLocaleDateString('pt-BR')}</td>
                    <td className="td-actions">
                      {d.type === 'RNC' && d.status === 'CONCLUIDO' && (
                        <button className="btn-icon" title="Gerar Relatório 8D" 
                          onClick={async () => {
                            try {
                              const res = await fetch(`${import.meta.env.VITE_API_URL}/reports/generate/${d.id}`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
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
                );
              })}
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

          <label className="form-label">Descrição
            <textarea className="form-input form-textarea"
              placeholder="Descreva o problema ou item auditado..."
              value={form.item_description} onChange={set('item_description')} required />
          </label>

          <div className="gut-section">
            <p className="gut-section__title">Scores GUT</p>
            <GUTInput label={`Gravidade (G) — ${form.gut_gravity}`} name="gut_gravity"
              value={form.gut_gravity}
              onChange={e => setForm(f => ({ ...f, gut_gravity: e.target.value }))} />
            <GUTInput label={`Urgência (U) — ${form.gut_urgency}`} name="gut_urgency"
              value={form.gut_urgency}
              onChange={e => setForm(f => ({ ...f, gut_urgency: e.target.value }))} />
            <GUTInput label={`Tendência (T) — ${form.gut_tendency}`} name="gut_tendency"
              value={form.gut_tendency}
              onChange={e => setForm(f => ({ ...f, gut_tendency: e.target.value }))} />
            <div className="gut-preview">
              Score: <strong>{form.gut_gravity * form.gut_urgency * form.gut_tendency}</strong>
              {' '}/ 729
            </div>
          </div>

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
