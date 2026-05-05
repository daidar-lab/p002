import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/auth.jsx';
import ToastContainer from './components/Toast.jsx';
import Login        from './pages/Login/index.jsx';
import Dashboard    from './pages/Dashboard/index.jsx';
import Documentos   from './pages/Documentos/index.jsx';
import Fornecedores from './pages/Fornecedores/index.jsx';
import Priorizacao  from './pages/Priorizacao/index.jsx';
import Auditorias   from './pages/Auditorias/index.jsx';
import './index.css';

const NAV = [
  { to: '/dashboard',    label: 'Dashboard'},
  { to: '/documentos',   label: 'Documentos'},
  { to: '/fornecedores', label: 'Fornecedores'},
  { to: '/priorizacao',  label: 'Priorização'},
  { to: '/auditorias',   label: 'Auditorias'},
];

function Sidebar() {
  const { user, logout } = useAuth();
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-mark">AQ</span>
        <span className="logo-text">Audit Quality</span>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon">{icon}</span>
            <span className="nav-item__label">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-user">{user?.name}</span>
        <button className="sidebar-logout" onClick={logout} title="Sair">⏻</button>
      </div>
    </aside>
  );
}

function AppShell() {
  const { user } = useAuth();
  if (!user) return <Login />;
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/"             element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/documentos"   element={<Documentos />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/priorizacao"  element={<Priorizacao />} />
          <Route path="/auditorias"   element={<Auditorias />} />
          <Route path="*"             element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}
