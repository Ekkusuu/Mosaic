import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8001';

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
  checkIntervalMs?: number;
}

export default function RequireAuth({ children, checkIntervalMs = 2000 }: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const guardActive = useRef(true);

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

    const check = async () => {
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

    check();

    const id = window.setInterval(check, checkIntervalMs);

    return () => {
      guardActive.current = false;
      window.clearInterval(id);
    };
  }, [checkIntervalMs]);

  if (status === 'pending') {
    return null;
  }

  if (status === 'denied') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
