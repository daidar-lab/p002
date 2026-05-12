import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate
} from 'react-router-dom';

import { AuthProvider, useAuth } from './utils/auth.jsx';

import ToastContainer from './components/Toast.jsx';

import Login        from './pages/Login/index.jsx';
import Dashboard    from './pages/Dashboard/index.jsx';
import Documentos   from './pages/Documentos/index.jsx';
import Fornecedores from './pages/Fornecedores/index.jsx';
import Auditorias   from './pages/Auditorias/index.jsx';
import Usuarios     from './pages/Usuarios/index.jsx';
import Notificacoes from './pages/Configuracoes/Notificacoes.jsx';
import Assinaturas  from './pages/Assinaturas/index.jsx';
import AuditoriaView from './pages/Auditoria/index.jsx';
import PortalFornecedor from './pages/Portal/PortalFornecedor.jsx';
import RHEList from './pages/RHE/index.jsx';
import RHEDetail from './pages/RHE/Detail.jsx';
import RHECreate from './pages/RHE/Create.jsx';

import './index.css';

const NAV = [
  { to: '/dashboard',    label: 'Dashboard' },
  { to: '/documentos',   label: 'Documentos' },
  { to: '/assinaturas',  label: 'Assinar RNC' },
  { to: '/auditoria',    label: 'Centro de Auditoria' },
  { to: '/rhes',         label: 'Homologação (RHE)' },
  { to: '/fornecedores', label: 'Fornecedores' },
  { to: '/auditorias',   label: 'Plano de Auditorias' },
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
        {NAV.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `nav-item ${isActive ? 'nav-item--active' : ''}`
            }
          >
            <span className="nav-item__label">{label}</span>
          </NavLink>
        ))}

        {/* ✅ Somente admin vê Usuários e Configurações */}
        {user?.role === 'admin' && (
          <>
            <NavLink
              to="/usuarios"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <span className="nav-item__label">Usuários</span>
            </NavLink>
            <NavLink
              to="/notificacoes"
              className={({ isActive }) =>
                `nav-item ${isActive ? 'nav-item--active' : ''}`
              }
            >
              <span className="nav-item__label">Notificações</span>
            </NavLink>
          </>
        )}
      </nav>

        <div className="sidebar-footer">
          <span className="sidebar-user">{user?.name}</span>
          <button
            className="sidebar-logout"
            onClick={() => {
              logout();
              window.location.href = '/';
            }}
            title="Sair"
          >
            ⏻
          </button>
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
          <Route path="/assinaturas"  element={<Assinaturas />} />
          <Route path="/auditoria"    element={<AuditoriaView />} />
          <Route path="/fornecedores" element={<Fornecedores />} />
          <Route path="/auditorias"   element={<Auditorias />} />
          <Route path="/rhes"         element={<RHEList />} />
          <Route path="/rhes/new"     element={<RHECreate />} />
          <Route path="/rhes/:id"     element={<RHEDetail />} />

          {/* ✅ Proteção por ROLE */}
          <Route
            path="/usuarios"
            element={
              user.role === 'admin'
                ? <Usuarios />
                : <Navigate to="/dashboard" replace />
            }
          />
          <Route
            path="/notificacoes"
            element={
              user.role === 'admin'
                ? <Notificacoes />
                : <Navigate to="/dashboard" replace />
            }
          />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/portal/:token" element={<PortalFornecedor />} />
          <Route path="*" element={<AppShell />} />
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </AuthProvider>
  );
}