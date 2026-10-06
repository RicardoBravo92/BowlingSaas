import React, { createContext, useContext, useState } from 'react';
import * as api from '../api/endpoints';

export type UserRole = 'OWNER' | 'MANAGER' | 'CASHIER' | 'MAINTENANCE' | 'USER';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    email: string;
    password: string;
    full_name?: string;
  }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
  /** Convenience helpers */
  isOwner: boolean;
  isCashier: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (savedUser && token) {
      try {
        return JSON.parse(savedUser) as User;
      } catch {
        return null;
      }
    }
    return null;
  });
  const [isLoading] = useState(false);

  const login = async (email: string, password: string) => {
    // Step 1: get token
    const tokenRes = await api.login({ username: email, password });
    const { access_token } = tokenRes.data;
    localStorage.setItem('token', access_token);

    // Step 2: fetch full profile (with role)
    const meRes = await api.getMe();
    const me: User = meRes.data;
    localStorage.setItem('user', JSON.stringify(me));
    setUser(me);
  };

  const register = async (data: {
    email: string;
    password: string;
    full_name?: string;
  }) => {
    const response = await api.register(data);
    // After register, don't auto-login — just return
    // If backend returns user, we could use it, but we prefer explicit login
    void response;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  /** Re-fetch the current profile (e.g. after a role change) and sync storage. */
  const refreshUser = async () => {
    const meRes = await api.getMe();
    const me: User = meRes.data;
    localStorage.setItem('user', JSON.stringify(me));
    setUser(me);
  };

  const isOwner = user?.role === 'OWNER';
  const isCashier = user?.role === 'CASHIER' || user?.role === 'MANAGER' || isOwner;

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, refreshUser, isLoading, isOwner, isCashier }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
