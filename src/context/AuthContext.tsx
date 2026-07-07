import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import * as authService from '../services/auth';
import type { AuthUser } from '../services/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  loginWithGoogle: (idToken: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => authService.getStoredUser());

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user !== null,
      login: async (username: string, password: string) => {
        const loggedInUser = await authService.login(username, password);
        setUser(loggedInUser);
      },
      loginWithGoogle: async (idToken: string) => {
        const loggedInUser = await authService.loginWithGoogle(idToken);
        setUser(loggedInUser);
      },
      logout: () => {
        authService.logout();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
