import React, { useState } from 'react';
import { useFornecedores } from '../../hooks/useData.js';
import Drawer from '../../components/Drawer.jsx';
import ConfirmModal from '../../components/ConfirmModal.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { ActiveBadge } from '../../components/Badge.jsx';
import { toast } from '../../components/Toast.jsx';

const EMPTY_FORM = { name: '', cnpj: '', contact: '', email: '', active: true };

export default function Fornecedores() {
  const { suppliers, loading, addSupplier, updateSupplier, deleteSupplier } = useFornecedores();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmId, setConfirmId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const openNew = () => { setEditing(null); setForm(EMPTY_FORM); setDrawerOpen(true); };
  const openEdit = (s) => {
    setEditing(s.id);
    setForm({ name: s.name, cnpj: s.cnpj, contact: s.contact, email: s.email, active: s.active });
    setDrawerOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...form, active: form.active === true || form.active === 'true' };
    if (editing) {
      updateSupplier(editing, payload);
      toast('Fornecedor atualizado');
    } else {
      addSupplier(payload);
      toast('Fornecedor cadastrado');
    }
    setDrawerOpen(false);
  };

  const handleDelete = () => {
    deleteSupplier(confirmId);
    setConfirmId(null);
    toast('Fornecedor excluído', 'error');
  };

  const filtered = suppliers.filter(s => {
    if (filterActive === 'true' && !s.active) return false;
    if (filterActive === 'false' && s.active) return false;
    if (search && !s.name.toLowerCase().includes(search.toLowerCase()) &&
        !s.cnpj.includes(search)) return false;
    return true;
  });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fornecedores</h1>
          <p className="page-subtitle">{suppliers.filter(s => s.active).length} ativos de {suppliers.length} cadastrados</p>
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

      <div className="card table-card">
        {loading ? <p className="loading-text">Carregando...</p>
        : filtered.length === 0 ? (
          <EmptyState icon="🏭" title="Nenhum fornecedor encontrado"
            action={<button className="btn-primary" onClick={openNew}>+ Novo Fornecedor</button>} />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Razão Social</th><th>CNPJ</th><th>Contato</th><th>E-mail</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td className="td-name">{s.name}</td>
                  <td className="mono">{s.cnpj}</td>
                  <td>{s.contact}</td>
                  <td className="text-sub">{s.email}</td>
                  <td><ActiveBadge active={s.active} /></td>
                  <td className="td-actions">
                    <button className="btn-icon" title="Editar" onClick={() => openEdit(s)}>✏️</button>
                    <button className="btn-icon btn-icon--danger" title="Excluir"
                      onClick={() => setConfirmId(s.id)}>🗑</button>
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
            <input className="form-input" placeholder="Nome da empresa" value={form.name} onChange={set('name')} required />
          </label>
          <label className="form-label">CNPJ
            <input className="form-input" placeholder="00.000.000/0001-00" value={form.cnpj} onChange={set('cnpj')} required />
          </label>
          <div className="form-row">
            <label className="form-label">Contato
              <input className="form-input" placeholder="Nome do responsável" value={form.contact} onChange={set('contact')} />
            </label>
            <label className="form-label">Status
              <select className="form-input" value={String(form.active)} onChange={set('active')}>
                <option value="true">Ativo</option>
                <option value="false">Inativo</option>
              </select>
            </label>
          </div>
          <label className="form-label">E-mail de contato
            <input className="form-input" type="email" placeholder="contato@empresa.com"
              value={form.email} onChange={set('email')} />
          </label>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setDrawerOpen(false)}>Cancelar</button>
            <button type="submit" className="btn-primary">{editing ? 'Salvar alterações' : 'Cadastrar'}</button>
          </div>
        </form>
      </Drawer>

      <ConfirmModal open={!!confirmId} title="Excluir fornecedor"
        description="Documentos vinculados a este fornecedor não serão afetados."
        onConfirm={handleDelete} onCancel={() => setConfirmId(null)} />
    </div>
  );
}
