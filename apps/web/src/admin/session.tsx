import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { AuthUser } from '@pcs/shared';
import { adminApi } from '../api/admin.js';

type Status = 'loading' | 'signedOut' | 'signedIn';

interface SessionValue {
  status: Status;
  user: AuthUser | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

/** Admin session in memory. The cookie is the source of truth; /auth/me restores it on load. */
export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let active = true;
    adminApi
      .session()
      .then((s) => {
        if (!active) return;
        setUser(s.user);
        setStatus('signedIn');
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
        setStatus('signedOut');
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const s = await adminApi.login(email, password);
    setUser(s.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      setUser(null);
      setStatus('signedOut');
    }
  }, []);

  const value = useMemo(() => ({ status, user, signIn, signOut }), [status, user, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useAdminSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useAdminSession must be used inside AdminSessionProvider');
  return ctx;
}

/** Protects every /admin page except login. Signed-out users go to login and come back afterwards. */
export function AdminGuard() {
  const session = useAdminSession();
  const location = useLocation();
  if (session.status === 'loading') return <div role="status" className="p-10 text-center text-muted">…</div>;
  if (session.status === 'signedOut') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}
