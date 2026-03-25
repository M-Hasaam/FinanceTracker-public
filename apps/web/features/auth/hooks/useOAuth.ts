'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, BACKEND_ORIGIN } from '@/common/libs/constants';
import { useAuth } from '@/common/hooks/useAuth';

export function useOAuth() {
  const router = useRouter();
  const { checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<Window | null>(null);
  // Holds the cleanup function so the unmount effect can always call the latest one.
  const cleanupRef = useRef<(() => void) | null>(null);

  // Remove listener + interval when the component unmounts mid-flow.
  useEffect(() => {
    return () => {
      cleanupRef.current?.();
    };
  }, []);

  const startOAuth = useCallback(
    async (provider: 'google') => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${API_URL}/auth/${provider}/start`, {
          method: 'POST',
          credentials: 'include',
        });

        if (!res.ok) {
          throw new Error('Failed to start OAuth');
        }

        const { authUrl } = await res.json();

        popupRef.current = window.open(
          authUrl,
          `${provider} OAuth`,
          'width=600,height=700,scrollbars=yes',
        );

        if (!popupRef.current) {
          setError('Popup was blocked. Please allow popups for this site.');
          setLoading(false);
          return;
        }

        // Declare cleanup first so handleMessage and the interval can both call it.
        let cleanupFn: (() => void) | null = null;

        const handleMessage = (event: MessageEvent) => {
          // Fix: use BACKEND_ORIGIN (real origin of the callback page, e.g.
          // http://localhost:3001), NOT API_URL which is '/api' in the browser.
          if (event.origin !== BACKEND_ORIGIN) return;
          if (event.data?.type !== 'OAUTH_RESULT') return;

          cleanupFn?.();

          if (event.data.status === 'SUCCESS') {
            checkAuth().then(() => {
              router.push('/');
              setLoading(false);
            });
          } else {
            setError('Authentication failed. Please try again.');
            setLoading(false);
          }
        };

        // Detect user manually closing the popup without completing auth.
        const intervalId = setInterval(() => {
          if (popupRef.current?.closed) {
            cleanupFn?.();
            setError('Authentication was cancelled.');
            setLoading(false);
          }
        }, 500);

        cleanupFn = () => {
          window.removeEventListener('message', handleMessage);
          clearInterval(intervalId);
          if (popupRef.current && !popupRef.current.closed) {
            popupRef.current.close();
          }
          cleanupRef.current = null;
        };
        cleanupRef.current = cleanupFn;

        window.addEventListener('message', handleMessage);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to start authentication',
        );
        setLoading(false);
      }
    },
    [checkAuth, router],
  );

  return { startOAuth, loading, error };
}
