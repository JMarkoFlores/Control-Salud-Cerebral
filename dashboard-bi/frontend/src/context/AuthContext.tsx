import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode
} from 'react';
import { clearSession, getStoredUser, getToken, loginRequest, storeSession } from '../lib/api';

interface AuthState {
  token: string | null;
  user: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [user, setUser] = useState<string | null>(() => getStoredUser());

  const logout = useCallback(() => {
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('bi:unauthorized', handler);
    return () => window.removeEventListener('bi:unauthorized', handler);
  }, [logout]);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const response = await loginRequest(username, password);
      storeSession(response.token, response.user.username);
      setToken(response.token);
      setUser(response.user.username);
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No fue posible iniciar sesión.';
      return { success: false, error: message };
    }
  }, []);

  const value = useMemo(
    () => ({ token, user, login, logout }),
    [token, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
