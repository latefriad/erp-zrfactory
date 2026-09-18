import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '@zr-erp/shared';
import { fetchApi } from '../lib/api';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  partnerId?: string | null;
  isActive: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  // Role & permission helpers
  isAdmin: boolean;
  isPartner: boolean;
  isEmployee: boolean;
  isViewer: boolean;
  canAccessFinance: boolean;
  canAccessPartners: boolean;
  canModifyFinance: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('zr_auth_token') : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session by verifying token with backend
  useEffect(() => {
    async function verifySession() {
      const storedToken = localStorage.getItem('zr_auth_token');
      if (!storedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const res = await fetchApi<{ user: AuthUser }>('/auth/me');
        setUser(res.user);
      } catch (err: any) {
        const isAuthError =
          err?.message?.includes('401') ||
          err?.message?.toLowerCase().includes('token') ||
          err?.message?.toLowerCase().includes('unauthorized') ||
          err?.message?.toLowerCase().includes('non autorisé');

        if (isAuthError) {
          console.warn('Session expired or invalid, clearing credentials.');
          localStorage.removeItem('zr_auth_token');
          setToken(null);
          setUser(null);
        } else {
          console.warn('Network or server unreachable, retaining token for retry:', err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await fetchApi<{ user: AuthUser; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass }),
    });

    localStorage.setItem('zr_auth_token', res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    try {
      fetchApi('/auth/logout', { method: 'POST' }).catch(() => {});
    } finally {
      localStorage.removeItem('zr_auth_token');
      setToken(null);
      setUser(null);
    }
  };

  const isAdmin = user?.role === UserRole.ADMIN;
  const isPartner = user?.role === UserRole.PARTNER;
  const isEmployee = user?.role === UserRole.EMPLOYEE;
  const isViewer = user?.role === UserRole.VIEWER;

  // Strict Business Guards:
  // - Finance & Partners: accessible ONLY by Admin and Partner
  // - Employee is STRICTLY forbidden from financial records & partner accounts
  const canAccessFinance = isAdmin || isPartner || isViewer;
  const canAccessPartners = isAdmin || isPartner;
  const canModifyFinance = isAdmin || isPartner;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        isAdmin,
        isPartner,
        isEmployee,
        isViewer,
        canAccessFinance,
        canAccessPartners,
        canModifyFinance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
