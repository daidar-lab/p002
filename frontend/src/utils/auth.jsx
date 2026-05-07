import { createContext, useContext, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem('aq_user'));
    } catch {
      return null;
    }
  });

  async function login(username, password) {
    const data = await api.login({ username, password });

    /**
     * Backend retorna:
     * {
     *   token,
     *   user
     * }
     */

    setUser(data.user);

    sessionStorage.setItem('aq_user', JSON.stringify(data.user));
    sessionStorage.setItem('aq_token', data.token);

    return data.user;
  }

  function logout() {
    setUser(null);
    sessionStorage.removeItem('aq_user');
    sessionStorage.removeItem('aq_token');
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}