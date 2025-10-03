import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000';

type Status = 'pending' | 'allowed' | 'denied';

interface Props {
  children: React.ReactNode;
  /** Optional manual override for fallback revalidation interval (ms) */
  fallbackIntervalMs?: number;
}

// Strategy (reduced CPU):
// 1. Initial check on mount.
// 2. Re-check ONLY on visibility/focus if last check is older than a throttle window.
// 3. No continuous interval (removes background timers entirely).
// 4. Throttle window default: 2 minutes (configurable via prop if needed in future).
const THROTTLE_MS = 2 * 60 * 1000; // 2 minutes

export default function RequireAuth({ children }: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const guardActive = useRef(true);
  const lastCheckRef = useRef<number>(0);

  const performCheck = async () => {
    const now = Date.now();
    // Throttle: skip if last check was recent (< THROTTLE_MS)
    if (lastCheckRef.current && (now - lastCheckRef.current) < THROTTLE_MS) return;
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

    return () => {
      guardActive.current = false;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  if (status === 'pending') return null;

  if (status === 'denied') {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
