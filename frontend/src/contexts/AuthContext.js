'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('codecollab-token');
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    } else {
      setLoading(false);
    }
  }, []);

  async function fetchUser(authToken) {
    try {
      const data = await api.get('/api/auth/me', authToken);
      setUser(data.user);
    } catch (err) {
      localStorage.removeItem('codecollab-token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  }

  const login = useCallback(async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('codecollab-token', data.token);
    return data;
  }, []);

  const register = useCallback(async (username, email, password) => {
    const data = await api.post('/api/auth/register', { username, email, password });
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('codecollab-token', data.token);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('codecollab-token');
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
