import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { authService, authStorage, type AuthUser } from '../services/authService';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => authStorage.getToken());
  const [loading, setLoading] = useState(true);

  const logout = () => {
    authStorage.clearToken();
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const currentToken = authStorage.getToken();
    if (!currentToken) {
      setUser(null);
      setToken(null);
      return;
    }

    const response = await authService.me(currentToken);
    setToken(currentToken);
    setUser(response.data);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!authStorage.getToken()) {
          if (!active) return;
          setLoading(false);
          return;
        }
        await refreshUser();
      } catch {
        logout();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onLogout = () => {
      logout();
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login(email, password);
    authStorage.setToken(response.data.token);
    setToken(response.data.token);
    setUser(response.data.user);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      refreshUser
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
