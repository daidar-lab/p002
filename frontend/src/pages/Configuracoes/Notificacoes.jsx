import React, { useState, useEffect } from 'react';
import Drawer from '../../components/Drawer.jsx';
import { toast } from '../../components/Toast.jsx';

const EMPTY = { defect_category: 'QUALIDADE', role_name: 'COORDENACAO', email: '', is_active: true };

export default function Notificacoes() {
  const [matrix, setMatrix] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/notifications`, {
      headers: { 'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setMatrix(data);
        else setMatrix([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const openEdit = (item) => {
    setEditing(item.id);
    setForm({ ...item });
    setDrawerOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const method = editing ? 'PUT' : 'POST';
    const url = editing 
      ? `${import.meta.env.VITE_API_URL}/notifications/${editing}`
      : `${import.meta.env.VITE_API_URL}/notifications`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('aq_token')}` 
        },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (editing) {
        setMatrix(prev => prev.map(m => m.id === editing ? data : m));
      } else {
        setMatrix(prev => [...prev, data]);
      }
      setDrawerOpen(false);
      toast('Configuração salva com sucesso');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1 className="page-title">Matriz de Notificações</h1>
          <p className="page-subtitle">Gerencie quem recebe alertas por categoria de defeito</p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setForm(EMPTY); setDrawerOpen(true); }}>+ Nova Configuração</button>
      </header>

      <div className="card table-card">
        {loading ? <p className="loading-text">Carregando matriz...</p> : (
          <table>
            <thead>
              <tr><th>Categoria</th><th>Papel Responsável</th><th>E-mail</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {matrix.map(m => (
                <tr key={m.id}>
                  <td><span className="badge">{m.defect_category}</span></td>
                  <td>{m.role_name}</td>
                  <td style={{ fontWeight: 600 }}>{m.email}</td>
                  <td>{m.is_active ? 'Ativo' : 'Inativo'}</td>
                  <td className="td-actions">
                    <button className="btn-icon" onClick={() => openEdit(m)}>✏️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Configurar Notificação">
        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label">Categoria de Defeito
            <select className="form-input" value={form.defect_category} onChange={e => setForm({...form, defect_category: e.target.value})}>
              <option>QUALIDADE</option>
              <option>PROCESSO</option>
              <option>MATERIAL</option>
              <option>SEGURANCA</option>
            </select>
          </label>
          <label className="form-label">Papel / Função
            <select className="form-input" value={form.role_name} onChange={e => setForm({...form, role_name: e.target.value})}>
              <option>COORDENACAO</option>
              <option>GERENCIA</option>
              <option>DIRETORIA</option>
              <option>COMPRAS</option>
              <option>PCP</option>
            </select>
          </label>
          <label className="form-label">E-mail para Alerta
            <input className="form-input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          </label>
          <label className="form-label">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} /> Ativo
          </label>
          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Configuração'}</button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
