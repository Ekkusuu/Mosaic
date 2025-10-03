import React, { useEffect, useRef, useState } from 'react';
import { Navigate } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000';

type Status = 'pending' | 'allowed' | 'denied';

interface Props {
  children: React.ReactNode;
  checkIntervalMs?: number;
}

export default function RequireAuth({ children, checkIntervalMs = 2000 }: Props) {
  const [status, setStatus] = useState<Status>('pending');
  const guardActive = useRef(true);

  useEffect(() => {
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
