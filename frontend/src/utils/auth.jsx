import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

// Credenciais hardcoded — trocar por JWT quando backend tiver auth
const USERS = [{ username: 'admin', password: 'admin', name: 'Administrador' }];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('aq_user')); } catch { return null; }
  });

  const login = (username, password) => {
    const found = USERS.find(u => u.username === username && u.password === password);
    if (!found) throw new Error('Usuário ou senha incorretos.');
    setUser(found);
    sessionStorage.setItem('aq_user', JSON.stringify(found));
    return found;
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('aq_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
