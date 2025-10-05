import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000';

// Helper to parse truthy env values like true/1/yes/on (case-insensitive)
function isTruthyEnv(val: unknown): boolean {
  if (typeof val === 'boolean') return val;
  if (typeof val === 'string') return /^(true|1|yes|on)$/i.test(val.trim());
  return false;
}

// Dev bypass flag from Vite env; only active in development mode
const BYPASS_AUTH = import.meta.env.DEV && isTruthyEnv(import.meta.env.VITE_BYPASS_AUTH);

type Status = 'pending' | 'allowed' | 'denied';

interface Props {
  children: React.ReactNode;
  /** Optional manual override for fallback revalidation interval (ms) */
  fallbackIntervalMs?: number;
}

// Strategy:
// 1. Initial check on mount.
// 2. Re-check on tab focus & when document becomes visible.
// 3. Fallback passive re-check every 10 minutes (configurable) in case user stays focused continuously.
// 4. No tight 1-2 second polling loop.
const DEFAULT_FALLBACK_INTERVAL = 10 * 60 * 1000; // 10 minutes

export default function RequireAuth({ children, fallbackIntervalMs = DEFAULT_FALLBACK_INTERVAL }: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const guardActive = useRef(true);
  const lastCheckRef = useRef<number>(0);

  const performCheck = async () => {
    // Debounce accidental rapid calls (e.g., double focus events)
    const now = Date.now();
    if (now - lastCheckRef.current < 500) return; // ignore if last check < 500ms ago
    lastCheckRef.current = now;
    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!guardActive.current) return;
      if (res.ok) {
        setStatus('allowed');
      } else if (res.status === 401) {
        setStatus('denied');
      } else {
        setStatus('denied');
      }
    } catch {
      if (!guardActive.current) return;
      setStatus('denied');
    }
  };

  useEffect(() => {
    // If bypassing auth in development, allow immediately and optionally seed mock user
    if (BYPASS_AUTH) {
      // Surface a clear message in the console so collaborators can verify it's active
      try { console.info('[RequireAuth] Dev auth bypass is ACTIVE'); } catch {}
      try {
        // Seed a minimal mock user for components that might read from storage later
        const mock = {
          id: 'dev-user',
          name: 'Dev User',
          email: 'dev@example.com',
          username: 'dev',
          honorLevel: 3,
        };
        // Only set if not already present to avoid clobbering real data
        if (!localStorage.getItem('mosaic:user')) {
          localStorage.setItem('mosaic:user', JSON.stringify(mock));
        }
      } catch {
        // ignore storage errors
      }
      setStatus('allowed');
      return;
    }

    guardActive.current = true;
    performCheck();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        performCheck();
      }
    };
    const onFocus = () => performCheck();

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);

    // Passive long interval fallback (in case user never changes focus/visibility)
    const fallbackId = window.setInterval(() => {
      performCheck();
    }, fallbackIntervalMs);

    return () => {
      guardActive.current = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(fallbackId);
    };
  }, [fallbackIntervalMs]);

  if (status === 'pending') return null;

  if (status === 'denied') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
