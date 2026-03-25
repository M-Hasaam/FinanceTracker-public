'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL } from '@/common/libs/constants';
import { useAuth } from '@/common/hooks/useAuth';

export function useTestLogin() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/auth/test-login`, {
        method: 'POST',
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Test login failed');
      }

      await checkAuth();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test login failed');
    } finally {
      setLoading(false);
    }
  };

  return { testLogin, loading, error };
}
