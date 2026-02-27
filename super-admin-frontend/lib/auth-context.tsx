'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import { notify, messages } from '@/lib/toast';

interface Admin {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  admin: Admin | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await apiClient.getMe();
      if (response.success) {
        setAdmin(response.admin);
      }
    } catch (error: any) {
      if (error.response?.status === 401) {
        // Silent fail for initial auth check
        console.log('Not authenticated');
      }
      setAdmin(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const toastId = notify.loading('Signing in...');
    
    try {
      const response = await apiClient.login(email, password);
      if (response.success) {
        setAdmin(response.admin);
        notify.dismiss(toastId);
        notify.success(messages.auth.loginSuccess, {
          description: `Welcome back, ${response.admin.name || response.admin.email}!`,
        });
        router.push('/dashboard');
      }
    } catch (error: any) {
      notify.dismiss(toastId);
      const errorMessage = error.response?.data?.error?.message || messages.auth.loginError;
      notify.error(errorMessage, {
        description: 'Please check your credentials and try again.',
      });
      throw error;
    }
  };

  const logout = async () => {
    const toastId = notify.loading('Signing out...');
    
    try {
      await apiClient.logout();
      setAdmin(null);
      notify.dismiss(toastId);
      notify.success(messages.auth.logoutSuccess);
      router.push('/login');
    } catch (error) {
      notify.dismiss(toastId);
      notify.error('Logout failed', {
        description: 'An error occurred while signing out.',
      });
    }
  };

  const refreshAdmin = async () => {
    try {
      const response = await apiClient.getMe();
      if (response.success) {
        setAdmin(response.admin);
      }
    } catch (error) {
      setAdmin(null);
      notify.error(messages.auth.sessionExpired, {
        description: 'Please sign in again.',
      });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        isLoading,
        isAuthenticated: !!admin,
        login,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
