"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { User, loginUser, updateUserData } from "@/lib/auth";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => void;
  updateUser: (data: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

const SESSION_KEY = "hh_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      const result = loginUser(email, password);
      if (!result) return { error: "Invalid email or password." };
      setUser(result);
      localStorage.setItem(SESSION_KEY, JSON.stringify(result));
      return {};
    },
    []
  );

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    // Hard navigate to home
    window.location.href = "/";
  }, []);

  const updateUser = useCallback(
    (data: Partial<User>) => {
      if (!user) return;
      const updated = updateUserData(user.id, data);
      if (!updated) return;
      setUser(updated);
      localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
