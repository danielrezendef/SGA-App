import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export type AuthUser = {
  id: number;
  name: string | null;
  email: string | null;
  profilePhoto?: string | null;
  documentLogoKey?: string | null;
  role: "user" | "admin";
  gerarContratoAutomaticamente?: number | boolean | null;
};

type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  refetch: () => Promise<unknown>;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthenticated: false,
  isAdmin: false,
  refetch: async () => undefined,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data: user, isLoading, refetch } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setSessionUser((user as AuthUser | null) ?? null);
  }, [user]);

  const value: AuthContextType = {
    user: sessionUser,
    loading: isLoading,
    isAuthenticated: !!sessionUser,
    isAdmin: sessionUser?.role === "admin",
    refetch,
    setUser: setSessionUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAppAuth() {
  return useContext(AuthContext);
}
