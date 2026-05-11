import React, { useState } from 'react';
import { useAuth } from '../../utils/auth.jsx';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm]   = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.username, form.password);
    } catch (err) {
      setError(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <span className="login-logo">AQ</span>
          <h1 className="login-title">Audit Quality</h1>
          <p className="login-sub">Sistema de gestão de auditorias</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="form-label">
            Usuário
            <input
              className="form-input"
              type="text"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              autoFocus
              required
            />
          </label>

          <label className="form-label">
            Senha
            <input
              className="form-input"
              type="password"
              placeholder="••••••"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              required
            />
          </label>

          {error && <p className="login-error">{error}</p>}

          <button className="btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="login-hint">Credenciais padrão: <code>admin / admin</code></p>
      </div>
    </div>
  );
}
