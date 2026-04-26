/**
 * AuthContext component/module file.
  * This file defines the AuthContext, which provides authentication-related state and functions to the PhishGuard Academy application.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  user_id: string;
  email: string;
  name: string;
  created_at: string;
  level: number;
  xp: number;
  streak: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  register: (email: string, password: string, name: string) => Promise<void>;
  login: (email: string, password: string) => Promise<{ mfaRequired: boolean; email?: string }>;
  verifyMfa: (email: string, token: string, backupCode?: string) => Promise<void>;
  logout: () => void;
  addXP: (xp: number) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Backend base URL: use Vite proxy in dev, allow override via env in other setups
  const API_URL = (import.meta as any)?.env?.VITE_API_URL ?? '';

  const clearAuthState = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

    const refreshUser = async () => {
    if (!token) return;
    
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        },
      });

      if (response.status === 401) {
        clearAuthState();
        return;
      }

      if (response.ok) {
        const data = await response.json();
        const updatedUser: User = {
          user_id: data.user_id,
          email: data.email,
          name: data.name,
          created_at: data.created_at,
          level: data.level,
          xp: data.xp,
          streak: data.streak,
        };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
        // Dispatch event to notify all components of user update
        window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  // Load token from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('auth_token');
    const savedUser = localStorage.getItem('auth_user');
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    
    setIsLoading(false);
  }, []);

  // Auto-refresh user stats every 10 seconds when authenticated and tab is visible
  useEffect(() => {
    const currentToken = localStorage.getItem('auth_token');
    if (!currentToken || !token) return;

        const interval = setInterval(async () => {
      if (localStorage.getItem('auth_token') && !document.hidden) {
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Cache-Control': 'no-cache'
            },
          });

          if (response.status === 401) {
            clearAuthState();
            return;
          }

          if (response.ok) {
            const data = await response.json();
            const updatedUser: User = {
              user_id: data.user_id,
              email: data.email,
              name: data.name,
              created_at: data.created_at,
              level: data.level,
              xp: data.xp,
              streak: data.streak,
            };
            setUser(updatedUser);
            localStorage.setItem('auth_user', JSON.stringify(updatedUser));
            // Dispatch event to notify all components of user update
            window.dispatchEvent(new CustomEvent('userUpdated', { detail: updatedUser }));
          }
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [token, API_URL]);

    const register = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, name }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();
      const newToken = data.access_token;
      
      setToken(newToken);
      setUser({
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        created_at: new Date().toISOString(),
        level: 1,
        xp: 0,
        streak: 0,
      });

      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_user', JSON.stringify({
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        created_at: new Date().toISOString(),
        level: 1,
        xp: 0,
        streak: 0,
      }));
    } finally {
      setIsLoading(false);
    }
  };

    const login = async (email: string, password: string): Promise<{ mfaRequired: boolean; email?: string }> => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();

      if (data.mfa_required) {
        // MFA challenge required; do not set token yet
        return { mfaRequired: true, email: data.email };
      }

      const newToken = data.access_token;

      setToken(newToken);
      setUser({
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        created_at: new Date().toISOString(),
        level: 1,
        xp: 0,
        streak: 0,
      });

      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_user', JSON.stringify({
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        created_at: new Date().toISOString(),
        level: 1,
        xp: 0,
        streak: 0,
      }));

      return { mfaRequired: false };
    } finally {
      setIsLoading(false);
    }
  };

    const verifyMfa = async (email: string, tokenValue: string, backupCode?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/auth/login/mfa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, token: tokenValue, backup_code: backupCode }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'MFA verification failed');
      }

      const data = await response.json();
      const newToken = data.access_token;

      setToken(newToken);
      setUser({
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        created_at: new Date().toISOString(),
        level: 1,
        xp: 0,
        streak: 0,
      });

      localStorage.setItem('auth_token', newToken);
      localStorage.setItem('auth_user', JSON.stringify({
        user_id: data.user_id,
        email: data.email,
        name: data.name,
        created_at: new Date().toISOString(),
        level: 1,
        xp: 0,
        streak: 0,
      }));
    } finally {
      setIsLoading(false);
    }
  };

    const logout = () => {
    clearAuthState();
    // Clear all user-specific data to prevent stale data
    localStorage.removeItem('phishguard_analyses');
    localStorage.removeItem('phishguard_progress');
    localStorage.removeItem('phishguard_settings');
    localStorage.removeItem('last_reminder_date');
  };

    const addXP = async (xp: number) => {
    if (!token) throw new Error('Not authenticated');

    try {
      const response = await fetch(`${API_URL}/api/auth/add-xp?xp=${xp}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to add XP');

      const data = await response.json();
      
      if (user) {
        const updatedUser = { ...user, xp: data.xp, level: data.level };
        setUser(updatedUser);
        localStorage.setItem('auth_user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error adding XP:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        register,
        login,
        verifyMfa,
        logout,
        addXP,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
