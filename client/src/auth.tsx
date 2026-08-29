import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api } from "./api";

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  household: Household | null;
  refresh: () => Promise<void>;
  setUser: (u: AuthUser | null) => void;
}

export interface Household {
  id: string;
  name: string;
  inviteCode: string;
  inviteCodeExpiresAt: string | null;
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  household: null,
  refresh: async () => {},
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const me = await api<AuthUser>("/auth/me");
      setUser(me);
      // v1: one household per user — find it via memberships on the household list endpoint
      const households = await api<Household[]>("/households/mine").catch(() => []);
      setHousehold(households[0] ?? null);
    } catch {
      setUser(null);
      setHousehold(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, household, refresh, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
