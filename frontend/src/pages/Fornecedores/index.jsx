import React, { useState } from 'react';
import { useFornecedores } from '../../hooks/useData.js';
import Drawer from '../../components/Drawer.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { ActiveBadge } from '../../components/Badge.jsx';
import { toast } from '../../components/Toast.jsx';

const EMPTY = { name: '', cnpj: '', contact_name: '', email: '', active: true };

export default function Fornecedores() {
  const { suppliers, loading, error, addSupplier, updateSupplier, deleteSupplier } = useFornecedores();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing]       = useState(null);
  const [form, setForm]             = useState(EMPTY);
  const [confirmId, setConfirmId]   = useState(null);
  const [saving, setSaving]         = useState(false);
  const [search, setSearch]         = useState('');
  const [filterActive, setFilterActive] = useState('');

  const openNew = () => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); };
  const openEdit = s => {
    setEditing(s.id);
    setForm({ name: s.name, cnpj: s.cnpj || '', contact_name: s.contact_name || '', email: s.email || '', active: s.active });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, active: form.active === true || form.active === 'true' };
      if (editing) {
        await updateSupplier(editing, payload);
        toast('Fornecedor atualizado');
      } else {
        await addSupplier(payload);
        toast('Fornecedor cadastrado');
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
      await deleteSupplier(confirmId);
      toast('Fornecedor excluído', 'error');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const filtered = suppliers.filter(s => {
    if (filterActive === 'true'  && !s.active) return false;
    if (filterActive === 'false' &&  s.active) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !(s.cnpj || '').includes(q)) return false;
    }
    return true;
  });

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="page-subtitle">
            {suppliers.filter(s => s.active).length} ativos de {suppliers.length} cadastrados
          </p>
        </div>
        <button className="btn-primary" onClick={openNew}>+ Novo Fornecedor</button>
      </div>

      <div className="filters">
        <input className="filter-input" placeholder="Buscar por nome ou CNPJ..."
          value={search} onChange={e => setSearch(e.target.value)} />
        <select className="filter-select" value={filterActive} onChange={e => setFilterActive(e.target.value)}>
          <option value="">Todos</option>
          <option value="true">Somente ativos</option>
          <option value="false">Somente inativos</option>
        </select>
      </div>

      {error && <p className="error-banner">⚠ {error}</p>}

      <div className="card table-card">
        {loading ? <p className="loading-text">Carregando...</p>
        : filtered.length === 0 ? (
          <EmptyState icon="🏭" title="Nenhum fornecedor encontrado"
            action={<button className="btn-primary" onClick={openNew}>+ Novo Fornecedor</button>} />
        ) : (
          <table>
            <thead>
              <tr><th>Razão Social</th><th>CNPJ</th><th>Contato</th><th>E-mail</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="td-name">{s.name}</td>
                  <td className="mono">{s.cnpj || '—'}</td>
                  <td>{s.contact_name || '—'}</td>
                  <td className="text-sub">{s.email || '—'}</td>
                  <td><ActiveBadge active={s.active} /></td>
                  <td className="td-actions">
                    <button className="btn-icon" onClick={() => openEdit(s)}>✏️</button>
                    <button className="btn-icon btn-icon--danger" onClick={() => setConfirmId(s.id)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}
        title={editing ? 'Editar Fornecedor' : 'Novo Fornecedor'}>
        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label">Razão Social
            <input className="form-input" value={form.name} onChange={set('name')} required />
          </label>
          <label className="form-label">CNPJ
            <input className="form-input" placeholder="00.000.000/0001-00"
              value={form.cnpj} onChange={set('cnpj')} />
          </label>
          <div className="form-row">
            <label className="form-label">Contato
              <input className="form-input" value={form.contact_name} onChange={set('contact_name')} />
            </label>
            <label className="form-label">Status
              <select className="form-input" value={String(form.active)} onChange={set('active')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>
          <label className="form-label">E-mail
            <input className="form-input" type="email" value={form.email} onChange={set('email')} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setDrawerOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Cadastrar'}
            </button>
          </div>
        </form>
      </Drawer>

      <ConfirmModal open={!!confirmId} title="Excluir fornecedor"
        description="Documentos vinculados não serão afetados."
        onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
