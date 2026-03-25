'use client';

import {
  useState,
  useEffect,
  useCallback,
  useContext,
  createContext,
} from 'react';
import { API_URL } from '../libs/constants';

export interface AuthUser {
  id: string;
  name: string | null;
  email: string;
  picture: string | null;
  provider: 'GOOGLE' | 'EMAIL';
}

export interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (data: {
    name?: string;
    picture?: string | null;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkAuth = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        const u = data?.user ?? data;
        if (u) {
          setUser({
            id: u.id,
            name: u.name ?? null,
            email: u.email,
            picture: u.picture ?? null,
            provider: (u.provider as 'GOOGLE' | 'EMAIL') ?? 'EMAIL',
          });
        }
      } else {
        setUser(null);
      }
      setError(null);
    } catch (err) {
      setUser(null);
      setError(err instanceof Error ? err.message : 'Auth check failed');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logout failed');
    }
  }, []);

  const updateUser = useCallback(
    async (data: { name?: string; picture?: string | null }) => {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          (err as { message?: string }).message || 'Failed to update profile',
        );
      }

      const result = await res.json();
      const u = result?.user;
      if (u) {
        setUser((prev) => ({
          id: u.id,
          name: u.name ?? null,
          email: u.email,
          picture: u.picture ?? null,
          provider: prev?.provider ?? 'EMAIL',
        }));
      }
    },
    [],
  );

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <AuthContext.Provider
      value={{ user, loading, error, checkAuth, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function useUser(): AuthUser | null {
  const { user } = useAuth();
  return user;
}

export function useIsAuthenticated(): boolean {
  const { user, loading } = useAuth();
  return !loading && user !== null;
}
