import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api, tokenStore } from "../api/client";
import type { Role, User } from "../api/types";

type AuthResponse = { token: string; user: User };

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (input: { name: string; email: string; password: string; role: "guest" | "owner" }) => Promise<User>;
  demoLogin: (role: Role) => Promise<User>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // On page load, if a token was saved, ask the API who it belongs to.
  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    api<{ user: User }>("/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const finish = useCallback(
    (res: AuthResponse) => {
      tokenStore.set(res.token);
      queryClient.clear(); // drop any data cached for the previous user
      setUser(res.user);
      return res.user;
    },
    [queryClient]
  );

  const value: AuthContextValue = {
    user,
    loading,
    login: (email, password) => api<AuthResponse>("/auth/login", { method: "POST", body: { email, password } }).then(finish),
    register: (input) => api<AuthResponse>("/auth/register", { method: "POST", body: input }).then(finish),
    demoLogin: (role) => api<AuthResponse>("/auth/demo", { method: "POST", body: { role } }).then(finish),
    logout: () => {
      tokenStore.clear();
      queryClient.clear();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
