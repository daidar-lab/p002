import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom';
import ToastContainer from './components/Toast.jsx';
import Documentos    from './pages/Documentos/index.jsx';
import Fornecedores  from './pages/Fornecedores/index.jsx';
import Priorizacao   from './pages/Priorizacao/index.jsx';
import Auditorias    from './pages/Auditorias/index.jsx';
import './index.css';

const NAV = [
  { to: '/documentos',   label: 'Documentos' },
  { to: '/fornecedores', label: 'Fornecedores' },
  { to: '/priorizacao',  label: 'Priorização' },
  { to: '/auditorias',   label: 'Auditorias' },
];
function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        <span className="logo-mark">AQ</span>
        <span className="logo-text">Audit Quality</span>
      </div>
      <nav className="sidebar-nav">
        {NAV.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) =>
            `nav-item ${isActive ? 'nav-item--active' : ''}`}>
            <span className="nav-item__icon">{icon}</span>
            <span className="nav-item__label">{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="sidebar-footer">
        <span className="sidebar-version">v0.1.0</span>
      </div>
    </aside>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<Navigate to="/documentos" replace />} />
            <Route path="/documentos"   element={<Documentos />} />
            <Route path="/fornecedores" element={<Fornecedores />} />
            <Route path="/priorizacao"  element={<Priorizacao />} />
            <Route path="/auditorias"   element={<Auditorias />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </BrowserRouter>
  );
}
