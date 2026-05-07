import { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import Drawer from '../../components/Drawer';

export default function Usuarios() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [form, setForm] = useState({
    username: '',
    password: '',
    name: '',
    email: '',
    role: 'gestor',
    active: true,
  });

  async function loadUsers() {
    const data = await api.getUsers();
    setUsers(data);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });
  }

  function newUser() {
    setEditing(null);
    setForm({
      username: '',
      password: '',
      name: '',
      email: '',
      role: 'gestor',
      active: true,
    });
    setOpen(true);
  }

  function editUser(user) {
    setEditing(user);
    setForm({
      username: user.username,
      name: user.name,
      email: user.email || '',
      role: user.role,
      active: user.active,
      password: '',
    });
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (editing) {
      await api.updateUser(editing.id, form);
    } else {
      await api.createUser(form);
    }

    setOpen(false);
    loadUsers();
  }

  async function remove(id) {
    if (!confirm('Remover usuário?')) return;
    await api.deleteUser(id);
    loadUsers();
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuários</h1>
          <p className="page-subtitle">
            Gerencie usuários e permissões de acesso
          </p>
        </div>

        <button className="btn-primary" onClick={newUser}>
          Novo usuário
        </button>
      </div>

      {/* Tabela */}
      <div className="card table-card">
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td className="td-name">{u.name}</td>
                <td className="mono">{u.username}</td>
                <td>{u.email}</td>
                <td>{u.role}</td>
                <td>{u.active ? 'Sim' : 'Não'}</td>
                <td className="td-actions">
                  <button
                    className="btn-icon"
                    title="Editar"
                    onClick={() => editUser(u)}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-icon--danger"
                    title="Excluir"
                    onClick={() => remove(u.id)}
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar usuário' : 'Novo usuário'}
      >
        <form className="form" onSubmit={handleSubmit}>
          <label className="form-label">
            Username
            <input
              className="form-input"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              disabled={!!editing}
            />
          </label>

          <label className="form-label">
            Nome
            <input
              className="form-input"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </label>

          <label className="form-label">
            Email
            <input
              className="form-input"
              name="email"
              value={form.email}
              onChange={handleChange}
            />
          </label>

          <label className="form-label">
            {editing ? 'Nova senha (opcional)' : 'Senha'}
            <input
              className="form-input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required={!editing}
            />
          </label>

          <label className="form-label">
            Role
            <select
              className="form-input"
              name="role"
              value={form.role}
              onChange={handleChange}
            >
              <option value="gestor">Gestor</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <label className="form-label" style={{ flexDirection: 'row', gap: 8 }}>
            <input
              type="checkbox"
              name="active"
              checked={form.active}
              onChange={handleChange}
            />
            Ativo
          </label>

          <div className="form-actions">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar
            </button>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
