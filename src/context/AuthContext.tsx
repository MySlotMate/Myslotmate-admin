import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loginRequest, fetchCurrentAdmin } from '../api/auth';
import type { AdminUser } from '../api/auth';
import { getToken, setToken } from '../api/client';

interface AuthUser {
  name: string;
  email: string;
  role: string;
  scope: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  // True while we validate a persisted token on initial load.
  initializing: boolean;
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAuthUser(admin: AdminUser): AuthUser {
  return {
    name: admin.name,
    email: admin.username,
    role: admin.role,
    scope: admin.scope,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initializing, setInitializing] = useState<boolean>(true);

  // On mount, validate any persisted token against the backend so a refresh
  // keeps the session — and a stale/expired token is cleared cleanly.
  useEffect(() => {
    let active = true;

    const restore = async () => {
      if (!getToken()) {
        if (active) setInitializing(false);
        return;
      }
      try {
        const admin = await fetchCurrentAdmin();
        if (active) setUser(toAuthUser(admin));
      } catch {
        setToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setInitializing(false);
      }
    };

    void restore();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    const admin = await loginRequest(username, password);
    setUser(toAuthUser(admin));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isAuthenticated: user !== null, initializing, user, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
