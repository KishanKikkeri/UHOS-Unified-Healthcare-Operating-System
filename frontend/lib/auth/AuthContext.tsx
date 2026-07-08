"use client";

/**
 * Phase 11 — Authentication & RBAC.
 *
 * Deliberately the same lightweight shape as LanguageContext.tsx: a plain
 * React Context + localStorage, no auth library. On mount, if a token is
 * already stored (persistent login across refreshes), it's verified
 * against GET /auth/me; an invalid/expired token is cleared silently so
 * the user just lands back on /login instead of seeing a crash.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  login as apiLogin,
  logout as apiLogout,
  demoLogin as apiDemoLogin,
  getCurrentUser,
  getStoredToken,
  setStoredToken,
  ApiError,
} from "@/lib/api";
import type { AuthUser } from "@/lib/types";
import type { Role } from "@/lib/rbac";

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial "is there already a valid token?" check resolves. */
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  /** Phase 12 — Demo Mode: role-only login, no credentials. */
  demoLogin: (role: Role) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Persistent login: on first mount, if a token survived a refresh,
  // silently re-hydrate the session instead of forcing a re-login.
  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setLoading(false);
      return;
    }
    getCurrentUser()
      .then((u) => setUser(u))
      .catch(() => {
        // Expired/invalid token — clear it and fall through to /login.
        setStoredToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await apiLogin(username, password);
    setStoredToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const demoLogin = useCallback(async (role: Role) => {
    const res = await apiDemoLogin(role);
    setStoredToken(res.access_token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } catch (err) {
      // A failed /auth/logout call (e.g. token already expired) should
      // never block the client from clearing its own local session.
      if (!(err instanceof ApiError)) throw err;
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, demoLogin, logout }),
    [user, loading, login, demoLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
