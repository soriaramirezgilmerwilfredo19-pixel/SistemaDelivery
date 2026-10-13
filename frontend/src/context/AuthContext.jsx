import { createContext, useContext, useState } from 'react';
import client from '../api/client';

const AuthContext = createContext(null);

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user')) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readUser);

  async function login(email, password) {
    const res = await client.post('/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  async function register(payload) {
    const res = await client.post('/auth/register', payload);
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  function homeFor(role) {
    if (role === 'admin') return '/admin';
    if (role === 'courier') return '/repartidor';
    return '/';
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, homeFor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
