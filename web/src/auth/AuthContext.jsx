import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('bm_token'));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('bm_user');
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (token) localStorage.setItem('bm_token', token);
    else localStorage.removeItem('bm_token');
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem('bm_user', JSON.stringify(user));
    else localStorage.removeItem('bm_user');
  }, [user]);

  async function login(email, password) {
    const { token: t, user: u } = await api.login(email, password);
    setToken(t);
    setUser(u);
    return u;
  }

  function logout() {
    setToken(null);
    setUser(null);
  }

  /** Update the stored user (e.g. after a password change clears mustChangePassword). */
  function updateUser(u) {
    setUser(u);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, updateUser }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
